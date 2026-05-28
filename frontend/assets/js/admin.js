const getAdminEventId = (event) => event?._id || event?.id || '';

const EDIT_EVENT_ID_KEY = 'eventhubEditEventId';
const EDIT_EVENT_PENDING_KEY = 'eventhubEditEventPending';

const usesStaticAdminRoutes = () => {
  return window.location.protocol === 'file:' || window.location.pathname.endsWith('.html');
};

const getAdminEventFormUrl = (event) => {
  const eventId = getAdminEventId(event);
  const formPath = usesStaticAdminRoutes() ? 'add-event.html' : '/add-event';
  return `${formPath}?id=${encodeURIComponent(eventId)}`;
};

const eventRows = (events) => events.map((event) => `
  <tr>
    <td>
      <strong><i class="bi bi-calendar2-event me-1"></i>${escapeHTML(event.title)}</strong>
      <div class="muted small">${escapeHTML(event.category)} | ${escapeHTML(event.city)}</div>
    </td>
    <td>${formatDate(event.date)}</td>
    <td>${Number(event.availableTickets || 0)}/${Number(event.totalTickets || 0)}</td>
    <td>${formatMoney(event.price)}</td>
    <td class="text-end">
      <a class="btn btn-sm btn-outline-light me-2" data-edit-event="${escapeHTML(getAdminEventId(event))}" href="${getAdminEventFormUrl(event)}"><i class="bi bi-pencil-square me-1"></i>Edit</a>
      <button class="btn btn-sm btn-outline-danger" data-delete-event="${escapeHTML(getAdminEventId(event))}" type="button"><i class="bi bi-trash me-1"></i>Delete</button>
    </td>
  </tr>
`).join('');

const bookingRows = (bookings) => bookings.slice(0, 8).map((booking) => `
  <tr>
    <td><i class="bi bi-person-circle me-1"></i>${escapeHTML(booking.user?.name || 'Unknown')}<div class="muted small">${escapeHTML(booking.user?.email || '')}</div></td>
    <td>${escapeHTML(booking.event?.title || 'Deleted event')}</td>
    <td>${Number(booking.quantity || 0)}</td>
    <td>${formatMoney(booking.totalAmount)}</td>
    <td><span class="status-${escapeHTML(booking.status)} text-capitalize fw-bold">${escapeHTML(booking.status)}</span></td>
  </tr>
`).join('');

const loadDashboard = async () => {
  if (!qs('#adminDashboard')) return;
  if (!requireAdmin()) return;

  try {
    const [eventsData, bookingsData, usersData] = await Promise.all([
      apiFetch('/events'),
      apiFetch('/bookings/admin'),
      apiFetch('/auth/users/count')
    ]);

    qs('#eventCount').textContent = eventsData.count;
    qs('#bookingCount').textContent = bookingsData.count;
    qs('#userCount').textContent = usersData.count;
    qs('#revenueTotal').textContent = formatMoney(
      bookingsData.bookings
        .filter((booking) => booking.status === 'confirmed')
        .reduce((sum, booking) => sum + booking.totalAmount, 0)
    );

    qs('#adminEvents').innerHTML = eventsData.events.length
      ? eventRows(eventsData.events)
      : '<tr><td colspan="5" class="text-center muted py-4"><i class="bi bi-calendar-plus d-block h3"></i>No events yet. Create your first listing.</td></tr>';

    qs('#adminBookings').innerHTML = bookingsData.bookings.length
      ? bookingRows(bookingsData.bookings)
      : '<tr><td colspan="5" class="text-center muted py-4"><i class="bi bi-inbox d-block h3"></i>No bookings yet.</td></tr>';

    document.querySelectorAll('a[data-edit-event]').forEach((link) => {
      link.addEventListener('click', (event) => {
        const eventId = link.dataset.editEvent;

        if (!eventId) {
          event.preventDefault();
          showToast('This event is missing an id. Please refresh and try again.', 'danger');
          return;
        }

        sessionStorage.setItem(EDIT_EVENT_ID_KEY, eventId);
        sessionStorage.setItem(EDIT_EVENT_PENDING_KEY, '1');
        link.href = getAdminEventFormUrl({ _id: eventId });
      });
    });

    document.querySelectorAll('[data-delete-event]').forEach((button) => {
      button.addEventListener('click', async () => {
        if (!confirm('Delete this event? Events with active bookings cannot be deleted.')) return;

        const originalLabel = button.innerHTML;
        button.disabled = true;
        button.innerHTML = '<i class="bi bi-hourglass-split me-1"></i>Deleting...';

        try {
          await apiFetch(`/events/${encodeURIComponent(button.dataset.deleteEvent)}`, { method: 'DELETE' });
          showToast('Event deleted successfully.');
          loadDashboard();
        } catch (error) {
          showToast(error.message, 'danger');
          button.disabled = false;
          button.innerHTML = originalLabel;
        }
      });
    });
  } catch (error) {
    showToast(`Dashboard could not be loaded. ${error.message}`, 'danger');
  }
};

const loadEventForm = async () => {
  const form = qs('#eventForm');
  if (!form) return;
  if (!requireAdmin()) return;

  const eventIdFromUrl = new URLSearchParams(window.location.search).get('id');
  const pendingEdit = sessionStorage.getItem(EDIT_EVENT_PENDING_KEY) === '1';
  const eventId = eventIdFromUrl || (pendingEdit ? sessionStorage.getItem(EDIT_EVENT_ID_KEY) : '');

  if (!eventIdFromUrl && eventId && window.history?.replaceState) {
    window.history.replaceState(null, '', `${window.location.pathname}?id=${encodeURIComponent(eventId)}`);
  }

  if (eventId) {
    sessionStorage.removeItem(EDIT_EVENT_PENDING_KEY);
  }

  if (eventId) {
    qs('#formTitle').textContent = 'Edit Event';
    qs('#submitLabel').innerHTML = '<i class="bi bi-check2-circle me-2"></i>Update Event';

    try {
      const { event } = await apiFetch(`/events/${encodeURIComponent(eventId)}`);
      ['title', 'description', 'category', 'date', 'time', 'venue', 'city', 'price', 'totalTickets'].forEach((field) => {
        if (!qs(`#${field}`)) return;
        qs(`#${field}`).value = field === 'date' ? event[field].slice(0, 10) : event[field];
      });

      if (event.poster && qs('#currentPoster') && qs('#currentPosterWrap')) {
        qs('#currentPoster').src = posterUrl(event.poster);
        qs('#currentPosterWrap').classList.remove('d-none');
      }
    } catch (error) {
      showToast(error.message, 'danger');
    }
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const submit = form.querySelector('button[type="submit"]');
    const originalLabel = submit.innerHTML;
    submit.disabled = true;
    submit.innerHTML = eventId
      ? '<i class="bi bi-hourglass-split me-2"></i>Updating...'
      : '<i class="bi bi-hourglass-split me-2"></i>Creating...';

    try {
      const formData = new FormData(form);
      const posterInput = qs('#poster');
      if (eventId && posterInput && posterInput.files.length === 0) {
        formData.delete('poster');
      }

      const path = eventId ? `/events/${encodeURIComponent(eventId)}` : '/events';
      const method = eventId ? 'PUT' : 'POST';
      await apiFetch(path, { method, body: formData });
      showToast(eventId ? 'Event updated successfully.' : 'Event created successfully.');
      setTimeout(() => {
        window.location.href = 'admin-dashboard.html';
      }, 700);
    } catch (error) {
      showToast(error.message, 'danger');
      submit.disabled = false;
      submit.innerHTML = originalLabel;
    }
  });
};

document.addEventListener('DOMContentLoaded', () => {
  loadDashboard();
  loadEventForm();
});
