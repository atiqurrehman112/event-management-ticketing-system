let cachedBookings = [];

const currentTicketUser = () => getUser() || { name: 'EventHub Guest', email: '' };

const ticketQrPattern = (bookingId = '') => {
  const seed = String(bookingId).replace(/\D/g, '').slice(-6) || '123456';
  return seed.padEnd(6, '7').split('').map((digit, index) => {
    const size = 12 + (Number(digit) % 3) * 4;
    const left = 16 + index * 18;
    const top = 16 + ((Number(digit) + index) % 4) * 14;
    return `<span style="left:${left}px;top:${top}px;width:${size}px;height:${size}px"></span>`;
  }).join('');
};

const ticketFileName = (booking) => `ticket-${booking._id}.pdf`;

const splitText = (doc, text, maxWidth) => doc.splitTextToSize(String(text || ''), maxWidth);

const ticketHtml = (booking) => {
  const user = currentTicketUser();
  const event = booking.event || {};
  const bookingDate = booking.bookedAt || booking.createdAt;

  return `
    <article class="print-ticket-card">
      <div class="print-ticket-header">
        <div>
          <div class="print-ticket-brand">EH</div>
          <strong>EventHub Ticket</strong>
        </div>
        <span class="print-ticket-status">${escapeHTML(booking.status)}</span>
      </div>
      <div class="print-ticket-body">
        <section>
          <small>Event</small>
          <h1>${escapeHTML(event.title || 'Event')}</h1>
          <p>${escapeHTML(event.description || 'Please show this ticket at the event entrance.')}</p>
        </section>
        <section class="print-ticket-grid">
          <div><small>Ticket ID</small><strong>${escapeHTML(booking._id)}</strong></div>
          <div><small>Guest</small><strong>${escapeHTML(user.name || 'Guest')}</strong><span>${escapeHTML(user.email || '')}</span></div>
          <div><small>Date / Time</small><strong>${event.date ? formatDate(event.date) : 'TBA'}</strong><span>${escapeHTML(event.time || '')}</span></div>
          <div><small>Venue</small><strong>${escapeHTML(event.venue || 'TBA')}</strong><span>${escapeHTML(event.city || '')}</span></div>
          <div><small>Quantity</small><strong>${Number(booking.quantity || 0)}</strong></div>
          <div><small>Total</small><strong>${formatMoney(booking.totalAmount)}</strong></div>
          <div><small>Booking Date</small><strong>${bookingDate ? formatDate(bookingDate) : 'TBA'}</strong></div>
          <div><small>Status</small><strong>${escapeHTML(booking.status)}</strong></div>
        </section>
      </div>
      <div class="print-ticket-footer">
        <div class="qr-placeholder" aria-label="Ticket QR placeholder">${ticketQrPattern(booking._id)}</div>
        <p>Please show this ticket at the event entrance.</p>
      </div>
    </article>
  `;
};

const printTicket = (booking) => {
  if (!booking || booking.status !== 'confirmed') return;

  const printWindow = window.open('', '_blank', 'width=900,height=720');
  if (!printWindow) {
    showToast('Please allow popups to print your ticket.', 'danger');
    return;
  }

  const stylesheetHref = new URL('assets/css/styles.css', window.location.href).href;
  printWindow.document.write(`
    <!doctype html>
    <html>
      <head>
        <title>EventHub Ticket</title>
        <link href="${stylesheetHref}" rel="stylesheet">
      </head>
      <body class="print-ticket-page">
        ${ticketHtml(booking)}
        <script>
          window.addEventListener('load', () => {
            window.print();
            window.onafterprint = () => window.close();
          });
        <\/script>
      </body>
    </html>
  `);
  printWindow.document.close();
};

const downloadTicket = async (booking) => {
  if (!booking || booking.status !== 'confirmed') return;

  const jsPDFConstructor = window.jspdf?.jsPDF;
  if (!jsPDFConstructor) {
    console.error('PDF generation failed: jsPDF library is not available on window.jspdf.');
    showToast('PDF library is still loading. Opening print view instead.', 'danger');
    printTicket(booking);
    return;
  }

  try {
    const user = currentTicketUser();
    const event = booking.event || {};
    const bookingDate = booking.bookedAt || booking.createdAt;
    const doc = new jsPDFConstructor({ unit: 'pt', format: 'letter', orientation: 'portrait' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const cardX = 42;
    const cardY = 42;
    const cardWidth = pageWidth - 84;

    doc.setFillColor(248, 250, 252);
    doc.rect(0, 0, pageWidth, doc.internal.pageSize.getHeight(), 'F');

    doc.setDrawColor(99, 102, 241);
    doc.setLineDashPattern([8, 5], 0);
    doc.roundedRect(cardX, cardY, cardWidth, 680, 14, 14, 'S');
    doc.setLineDashPattern([], 0);

    doc.setFillColor(17, 24, 39);
    doc.roundedRect(cardX, cardY, cardWidth, 92, 14, 14, 'F');
    doc.setFillColor(67, 56, 202);
    doc.rect(cardX + cardWidth * 0.48, cardY, cardWidth * 0.52, 92, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.text('EventHub Ticket', cardX + 28, cardY + 38);
    doc.setFontSize(10);
    doc.text(`STATUS: ${String(booking.status).toUpperCase()}`, cardX + cardWidth - 148, cardY + 38);

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(24);
    doc.text(event.title || 'Event', cardX + 28, cardY + 136);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(71, 85, 105);
    doc.text(splitText(doc, event.description || 'Please show this ticket at the event entrance.', cardWidth - 56), cardX + 28, cardY + 160);

    const rows = [
      ['Ticket ID', booking._id],
      ['Guest', `${user.name || 'Guest'}${user.email ? ` (${user.email})` : ''}`],
      ['Date / Time', `${event.date ? formatDate(event.date) : 'TBA'} ${event.time || ''}`],
      ['Venue', `${event.venue || 'TBA'}${event.city ? `, ${event.city}` : ''}`],
      ['Quantity', Number(booking.quantity || 0)],
      ['Total', formatMoney(booking.totalAmount)],
      ['Booking Date', bookingDate ? formatDate(bookingDate) : 'TBA'],
      ['Status', booking.status]
    ];

    let y = cardY + 230;
    rows.forEach(([label, value], index) => {
      const x = cardX + 28 + (index % 2) * ((cardWidth - 56) / 2);
      if (index % 2 === 0 && index > 0) y += 76;

      doc.setFillColor(241, 245, 249);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(x, y, (cardWidth - 72) / 2, 58, 8, 8, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(String(label).toUpperCase(), x + 12, y + 18);
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.text(splitText(doc, value, (cardWidth - 108) / 2), x + 12, y + 38);
    });

    const qrX = cardX + 28;
    const qrY = cardY + 570;
    doc.setDrawColor(15, 23, 42);
    doc.roundedRect(qrX, qrY, 92, 92, 8, 8, 'S');
    for (let row = 0; row < 7; row += 1) {
      for (let col = 0; col < 7; col += 1) {
        const shouldFill = (row * col + String(booking._id).length + col) % 3 !== 0;
        if (shouldFill) {
          doc.setFillColor(15, 23, 42);
          doc.rect(qrX + 10 + col * 10, qrY + 10 + row * 10, 7, 7, 'F');
        }
      }
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(15, 23, 42);
    doc.text('Please show this ticket at the event entrance.', qrX + 118, qrY + 38);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text('Generated by EventHub', qrX + 118, qrY + 58);

    const output = doc.output('arraybuffer');
    if (!output || output.byteLength < 1000) {
      throw new Error(`Generated PDF is unexpectedly small (${output?.byteLength || 0} bytes).`);
    }

    doc.save(ticketFileName(booking));
    showToast('Ticket PDF downloaded.');
  } catch (error) {
    console.error('Ticket PDF generation failed:', error, { booking });
    showToast('Could not download ticket PDF. Opening print view instead.', 'danger');
    printTicket(booking);
  }
};

const ticketActions = (booking) => {
  if (booking.status !== 'confirmed') {
    return '<span class="muted small"><i class="bi bi-lock me-1"></i>Cancelled tickets are not valid for print or download.</span>';
  }

  return `
    <div class="ticket-actions">
      <button class="btn btn-sm btn-outline-light" data-print-ticket="${escapeHTML(booking._id)}" type="button"><i class="bi bi-printer me-1"></i>Print Ticket</button>
      <button class="btn btn-sm btn-primary" data-download-ticket="${escapeHTML(booking._id)}" type="button"><i class="bi bi-file-earmark-pdf me-1"></i>Download PDF</button>
      <button class="btn btn-sm btn-outline-light" data-cancel="${escapeHTML(booking._id)}" type="button"><i class="bi bi-x-circle me-1"></i>Cancel</button>
    </div>
  `;
};

const wireTicketButtons = () => {
  document.querySelectorAll('[data-print-ticket]').forEach((button) => {
    button.addEventListener('click', () => {
      const booking = cachedBookings.find((item) => item._id === button.dataset.printTicket);
      printTicket(booking);
    });
  });

  document.querySelectorAll('[data-download-ticket]').forEach((button) => {
    button.addEventListener('click', async () => {
      const booking = cachedBookings.find((item) => item._id === button.dataset.downloadTicket);
      const originalLabel = button.innerHTML;
      button.disabled = true;
      button.innerHTML = '<i class="bi bi-hourglass-split me-1"></i>Preparing...';
      await downloadTicket(booking);
      button.disabled = false;
      button.innerHTML = originalLabel;
    });
  });

  document.querySelectorAll('[data-cancel]').forEach((button) => {
    button.addEventListener('click', async () => {
      const originalLabel = button.innerHTML;
      button.disabled = true;
      button.innerHTML = '<i class="bi bi-hourglass-split me-1"></i>Cancelling...';

      try {
        await apiFetch(`/bookings/${encodeURIComponent(button.dataset.cancel)}/cancel`, { method: 'PATCH' });
        showToast('Ticket cancelled and seats restored.');
        loadMyTickets();
      } catch (error) {
        showToast(error.message, 'danger');
        button.disabled = false;
        button.innerHTML = originalLabel;
      }
    });
  });
};

const loadMyTickets = async () => {
  if (!qs('#ticketsList')) return;
  if (!requireAuth()) return;

  const list = qs('#ticketsList');
  list.innerHTML = '<div class="empty-state"><i class="bi bi-hourglass-split"></i><span>Loading your tickets...</span></div>';

  try {
    const data = await apiFetch('/bookings/mine');
    cachedBookings = data.bookings || [];

    if (!cachedBookings.length) {
      list.innerHTML = '<div class="empty-state"><i class="bi bi-ticket-perforated"></i><span>You have not booked any tickets yet. Explore events to reserve your first seat.</span><a class="btn btn-primary btn-sm mt-2" href="events.html"><i class="bi bi-search me-1"></i>Explore Events</a></div>';
      return;
    }

    list.innerHTML = cachedBookings.map((booking) => `
      <div class="surface hover-lift p-3 p-md-4 mb-3">
        <div class="row g-3 align-items-center">
          <div class="col-md-2">
            <img class="ticket-thumb rounded-2" src="${posterUrl(booking.event?.poster)}" alt="${escapeHTML(booking.event?.title || 'Event')} poster">
          </div>
          <div class="col-md-4">
            <span class="badge ${booking.status === 'confirmed' ? 'badge-soft' : 'badge-hot'} mb-2 text-capitalize">${escapeHTML(booking.status)}</span>
            <h2 class="h5 fw-bold mb-1"><i class="bi bi-calendar2-event me-1"></i>${escapeHTML(booking.event?.title || 'Deleted event')}</h2>
            <p class="muted mb-0">${booking.event ? `${formatDate(booking.event.date)} | ${escapeHTML(booking.event.venue)}, ${escapeHTML(booking.event.city)}` : 'Event details unavailable'}</p>
          </div>
          <div class="col-6 col-md-2">
            <small class="muted d-block">Tickets</small>
            <strong>${Number(booking.quantity || 0)}</strong>
          </div>
          <div class="col-6 col-md-2">
            <small class="muted d-block">Total</small>
            <strong>${formatMoney(booking.totalAmount)}</strong>
          </div>
          <div class="col-md-2 text-md-end">
            ${ticketActions(booking)}
          </div>
        </div>
      </div>
    `).join('');

    wireTicketButtons();
  } catch (error) {
    list.innerHTML = `<div class="empty-state"><i class="bi bi-wifi-off"></i><span>Could not load your tickets. ${escapeHTML(error.message)}</span></div>`;
  }
};

document.addEventListener('DOMContentLoaded', loadMyTickets);
