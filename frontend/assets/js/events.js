const eventDateParts = (value) => {
  const date = new Date(value);
  return {
    day: new Intl.DateTimeFormat('en', { day: '2-digit' }).format(date),
    month: new Intl.DateTimeFormat('en', { month: 'short' }).format(date)
  };
};

const getEventId = (event) => event?._id || event?.id || '';

const SELECTED_EVENT_ID_KEY = 'eventhubSelectedEventId';

const usesStaticHtmlRoutes = () => {
  return window.location.protocol === 'file:' || window.location.pathname.endsWith('.html');
};

const getEventDetailsUrl = (event) => {
  const eventId = getEventId(event);
  const detailsPath = usesStaticHtmlRoutes() ? 'event-details.html' : '/event-details';
  return `${detailsPath}?id=${encodeURIComponent(eventId)}`;
};

const missingEventMessage = () => `
  <div class="empty-state">
    <i class="bi bi-exclamation-circle"></i>
    <span>Event not found. Please go back to Events.</span>
    <a class="btn btn-primary btn-sm mt-2" href="events.html"><i class="bi bi-arrow-left me-1"></i>Back to Events</a>
  </div>
`;

const createEventCard = (event) => {
  const eventId = getEventId(event);
  const detailsUrl = getEventDetailsUrl(event);
  const description = event.description || '';
  const date = eventDateParts(event.date);
  const seats = Number(event.availableTickets || 0);
  const col = document.createElement('div');
  col.className = 'col-md-6 col-xl-4';
  col.innerHTML = `
    <article class="card event-card hover-lift">
      <div class="event-media">
        <img src="${posterUrl(event.poster)}" alt="${escapeHTML(event.title)} poster">
        <div class="date-badge"><strong>${date.day}</strong><span>${date.month}</span></div>
      </div>
      <div class="card-body d-flex flex-column p-4">
        <div class="d-flex justify-content-between gap-2 align-items-start mb-3">
          <span class="badge badge-soft">${escapeHTML(event.category)}</span>
          <span class="price-pill">${formatMoney(event.price)}</span>
        </div>
        <h3 class="h5 fw-bold mb-2">${escapeHTML(event.title)}</h3>
        <p class="muted mb-2"><i class="bi bi-geo-alt me-1"></i>${escapeHTML(event.venue)} | ${escapeHTML(event.city)}</p>
        <p class="muted flex-grow-1">${escapeHTML(description.slice(0, 118))}${description.length > 118 ? '...' : ''}</p>
        <div class="d-flex justify-content-between align-items-center mb-3">
          <small class="muted"><i class="bi bi-people me-1"></i>${seats} seats available</small>
          <small class="${seats > 0 ? 'status-confirmed' : 'status-cancelled'} fw-bold">${seats > 0 ? 'Open' : 'Sold out'}</small>
        </div>
        <div class="d-flex gap-2">
          <a class="btn btn-outline-light btn-sm flex-fill" data-event-details href="${detailsUrl}"><i class="bi bi-eye me-1"></i>Details</a>
          <a class="btn btn-primary btn-sm flex-fill" data-event-details href="${detailsUrl}"><i class="bi bi-ticket-perforated me-1"></i>Book Ticket</a>
        </div>
      </div>
    </article>
  `;
  col.querySelectorAll('[data-event-details]').forEach((link) => {
    link.addEventListener('click', (clickEvent) => {
      if (!eventId) {
        clickEvent.preventDefault();
        showToast('This event is missing an id. Please refresh and try again.', 'danger');
        return;
      }

      sessionStorage.setItem(SELECTED_EVENT_ID_KEY, eventId);
      link.href = getEventDetailsUrl(event);
    });
  });
  return col;
};

const loadEvents = async () => {
  const list = qs('#eventsList');
  if (!list) return;

  list.innerHTML = '<div class="col-12"><div class="empty-state"><i class="bi bi-hourglass-split"></i><span>Loading events...</span></div></div>';

  try {
    const params = new URLSearchParams();
    const search = qs('#search')?.value.trim();
    const category = qs('#category')?.value.trim();
    const city = qs('#city')?.value.trim();
    if (search) params.set('search', search);
    if (category) params.set('category', category);
    if (city) params.set('city', city);

    const query = params.toString();
    const data = await apiFetch(`/events${query ? `?${query}` : ''}`);
    list.innerHTML = '';

    if (!data.events.length) {
      list.innerHTML = '<div class="col-12"><div class="empty-state"><i class="bi bi-search"></i><span>No events match your search. Try a different city, category, or keyword.</span></div></div>';
      return;
    }

    data.events.forEach((event) => list.appendChild(createEventCard(event)));
  } catch (error) {
    list.innerHTML = `<div class="col-12"><div class="empty-state"><i class="bi bi-wifi-off"></i><span>Could not load events. ${escapeHTML(error.message)}</span></div></div>`;
  }
};

const loadFeaturedEvents = async () => {
  const list = qs('#featuredEvents');
  if (!list) return;

  try {
    const data = await apiFetch('/events');
    const events = data.events.slice(0, 3);
    list.innerHTML = '';

    if (!events.length) {
      list.innerHTML = '<div class="col-12"><div class="empty-state"><i class="bi bi-stars"></i><span>Featured events will appear here after an admin creates listings.</span></div></div>';
      return;
    }

    events.forEach((event) => list.appendChild(createEventCard(event)));
  } catch (error) {
    list.innerHTML = `<div class="col-12"><div class="empty-state"><i class="bi bi-wifi-off"></i><span>Could not load featured events. ${escapeHTML(error.message)}</span></div></div>`;
  }
};

const loadEventDetails = async () => {
  const root = qs('#eventDetails');
  if (!root) return;

  const eventIdFromUrl = new URLSearchParams(window.location.search).get('id');
  const eventId = eventIdFromUrl || sessionStorage.getItem(SELECTED_EVENT_ID_KEY);
  if (!eventId || eventId === 'undefined' || eventId === 'null') {
    root.innerHTML = missingEventMessage();
    return;
  }

  if (!eventIdFromUrl && window.history?.replaceState) {
    window.history.replaceState(null, '', `${window.location.pathname}?id=${encodeURIComponent(eventId)}`);
  }

  try {
    const { event } = await apiFetch(`/events/${eventId}`);
    const fetchedEventId = getEventId(event);

    if (!fetchedEventId) {
      root.innerHTML = missingEventMessage();
      return;
    }

    sessionStorage.setItem(SELECTED_EVENT_ID_KEY, fetchedEventId);

    const isSoldOut = Number(event.availableTickets || 0) < 1;
    const date = eventDateParts(event.date);

    root.innerHTML = `
      <div class="row g-4 align-items-start">
        <div class="col-lg-7">
          <div class="surface overflow-hidden">
            <div class="event-media">
              <img class="event-poster" src="${posterUrl(event.poster)}" alt="${escapeHTML(event.title)} poster">
              <div class="date-badge"><strong>${date.day}</strong><span>${date.month}</span></div>
            </div>
          </div>
        </div>
        <div class="col-lg-5">
          <div class="surface-strong p-4 p-md-5">
            <div class="d-flex justify-content-between align-items-start gap-3 mb-3">
              <span class="badge badge-soft">${escapeHTML(event.category)}</span>
              <span class="price-pill">${formatMoney(event.price)}</span>
            </div>
            <h2 class="fw-bold mb-3">${escapeHTML(event.title)}</h2>
            <p class="muted">${escapeHTML(event.description)}</p>
            <div class="row g-3 my-3">
              <div class="col-6"><div class="surface-soft p-3 h-100"><small class="muted d-block"><i class="bi bi-calendar2 me-1"></i>Date</small><strong>${formatDate(event.date)}</strong></div></div>
              <div class="col-6"><div class="surface-soft p-3 h-100"><small class="muted d-block"><i class="bi bi-clock me-1"></i>Time</small><strong>${escapeHTML(event.time)}</strong></div></div>
              <div class="col-6"><div class="surface-soft p-3 h-100"><small class="muted d-block"><i class="bi bi-building me-1"></i>Venue</small><strong>${escapeHTML(event.venue)}</strong></div></div>
              <div class="col-6"><div class="surface-soft p-3 h-100"><small class="muted d-block"><i class="bi bi-geo-alt me-1"></i>City</small><strong>${escapeHTML(event.city)}</strong></div></div>
            </div>
            <div class="d-flex justify-content-between align-items-center mb-3">
              <span class="muted">${Number(event.availableTickets || 0)} of ${Number(event.totalTickets || 0)} seats available</span>
              <span class="${isSoldOut ? 'status-cancelled' : 'status-confirmed'} fw-bold">${isSoldOut ? 'Sold Out' : 'Available'}</span>
            </div>
            <form id="bookingForm" class="d-flex flex-column flex-sm-row gap-2">
              <input class="form-control" id="quantity" type="number" min="1" max="${Number(event.availableTickets || 0)}" value="${isSoldOut ? 0 : 1}" aria-label="Ticket quantity" ${isSoldOut ? 'disabled' : ''}>
              <button class="btn btn-primary flex-shrink-0" type="submit" ${isSoldOut ? 'disabled' : ''}>${isSoldOut ? '<i class="bi bi-x-circle me-2"></i>Sold Out' : '<i class="bi bi-ticket-perforated me-2"></i>Book Ticket'}</button>
            </form>
          </div>
        </div>
      </div>
    `;

    qs('#bookingForm').addEventListener('submit', async (submitEvent) => {
      submitEvent.preventDefault();
      if (!requireAuth()) return;

      const button = qs('#bookingForm button[type="submit"]');
      button.disabled = true;
      const originalLabel = button.textContent;
      button.textContent = 'Booking...';

      try {
        await apiFetch('/bookings', {
          method: 'POST',
          body: JSON.stringify({
            eventId: fetchedEventId,
            quantity: Number(qs('#quantity').value)
          })
        });
        showToast('Ticket booked successfully. Redirecting to your tickets.');
        setTimeout(() => {
          window.location.href = 'my-tickets.html';
        }, 700);
      } catch (error) {
        showToast(error.message, 'danger');
        button.disabled = false;
        button.textContent = originalLabel;
      }
    });
  } catch (error) {
    root.innerHTML = missingEventMessage();
  }
};

document.addEventListener('DOMContentLoaded', () => {
  loadFeaturedEvents();
  loadEvents();
  loadEventDetails();
  qs('#filterForm')?.addEventListener('submit', (event) => {
    event.preventDefault();
    loadEvents();
  });
});
