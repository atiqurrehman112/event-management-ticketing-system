const loadMyTickets = async () => {
  if (!qs('#ticketsList')) return;
  if (!requireAuth()) return;

  const list = qs('#ticketsList');
  list.innerHTML = '<div class="empty-state"><i class="bi bi-hourglass-split"></i><span>Loading your tickets...</span></div>';

  try {
    const data = await apiFetch('/bookings/mine');

    if (!data.bookings.length) {
      list.innerHTML = '<div class="empty-state"><i class="bi bi-ticket-perforated"></i><span>You have not booked any tickets yet. Explore events to reserve your first seat.</span><a class="btn btn-primary btn-sm mt-2" href="events.html"><i class="bi bi-search me-1"></i>Explore Events</a></div>';
      return;
    }

    list.innerHTML = data.bookings.map((booking) => `
      <div class="surface hover-lift p-3 p-md-4 mb-3">
        <div class="row g-3 align-items-center">
          <div class="col-md-2">
            <img class="ticket-thumb rounded-2" src="${posterUrl(booking.event?.poster)}" alt="${escapeHTML(booking.event?.title || 'Event')} poster">
          </div>
          <div class="col-md-5">
            <span class="badge ${booking.status === 'confirmed' ? 'badge-soft' : 'badge-hot'} mb-2 text-capitalize">${escapeHTML(booking.status)}</span>
            <h2 class="h5 fw-bold mb-1"><i class="bi bi-calendar2-event me-1"></i>${escapeHTML(booking.event?.title || 'Deleted event')}</h2>
            <p class="muted mb-0">${booking.event ? `${formatDate(booking.event.date)} | ${escapeHTML(booking.event.venue)}, ${escapeHTML(booking.event.city)}` : 'Event details unavailable'}</p>
          </div>
          <div class="col-6 col-md-2">
            <small class="muted d-block">Tickets</small>
            <strong>${Number(booking.quantity || 0)}</strong>
          </div>
          <div class="col-6 col-md-1">
            <small class="muted d-block">Total</small>
            <strong>${formatMoney(booking.totalAmount)}</strong>
          </div>
          <div class="col-md-2 text-md-end">
            ${booking.status === 'confirmed' ? `<button class="btn btn-sm btn-outline-light" data-cancel="${escapeHTML(booking._id)}" type="button"><i class="bi bi-x-circle me-1"></i>Cancel</button>` : '<span class="muted small"><i class="bi bi-lock me-1"></i>Closed</span>'}
          </div>
        </div>
      </div>
    `).join('');

    document.querySelectorAll('[data-cancel]').forEach((button) => {
      button.addEventListener('click', async () => {
        const originalLabel = button.textContent;
        button.disabled = true;
        button.textContent = 'Cancelling...';

        try {
          await apiFetch(`/bookings/${encodeURIComponent(button.dataset.cancel)}/cancel`, { method: 'PATCH' });
          showToast('Ticket cancelled and seats restored.');
          loadMyTickets();
        } catch (error) {
          showToast(error.message, 'danger');
          button.disabled = false;
          button.textContent = originalLabel;
        }
      });
    });
  } catch (error) {
    list.innerHTML = `<div class="empty-state"><i class="bi bi-wifi-off"></i><span>Could not load your tickets. ${escapeHTML(error.message)}</span></div>`;
  }
};

document.addEventListener('DOMContentLoaded', loadMyTickets);
