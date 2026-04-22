export const VOLUNTEER_ID_STORAGE_KEY = "sahayak.volunteerId";
export const VOLUNTEER_EMAIL_STORAGE_KEY = "sahayak.volunteerEmail";
export const VOLUNTEER_NAME_STORAGE_KEY = "sahayak.volunteerName";
export const VOLUNTEER_PHONE_STORAGE_KEY = "sahayak.volunteerPhone";

export type VolunteerSession = {
  volunteerId?: string;
  email?: string;
  name?: string;
  phone?: string;
};

export const getVolunteerSession = (): VolunteerSession => {
  if (typeof window === "undefined") {
    return {};
  }

  return {
    volunteerId: window.localStorage.getItem(VOLUNTEER_ID_STORAGE_KEY) ?? undefined,
    email: window.localStorage.getItem(VOLUNTEER_EMAIL_STORAGE_KEY) ?? undefined,
    name: window.localStorage.getItem(VOLUNTEER_NAME_STORAGE_KEY) ?? undefined,
    phone: window.localStorage.getItem(VOLUNTEER_PHONE_STORAGE_KEY) ?? undefined,
  };
};

export const setVolunteerSession = (session: VolunteerSession) => {
  if (typeof window === "undefined") {
    return;
  }

  if (session.volunteerId) {
    window.localStorage.setItem(VOLUNTEER_ID_STORAGE_KEY, session.volunteerId);
  } else {
    window.localStorage.removeItem(VOLUNTEER_ID_STORAGE_KEY);
  }

  if (session.email) {
    window.localStorage.setItem(VOLUNTEER_EMAIL_STORAGE_KEY, session.email);
  } else {
    window.localStorage.removeItem(VOLUNTEER_EMAIL_STORAGE_KEY);
  }

  if (session.name) {
    window.localStorage.setItem(VOLUNTEER_NAME_STORAGE_KEY, session.name);
  } else {
    window.localStorage.removeItem(VOLUNTEER_NAME_STORAGE_KEY);
  }

  if (session.phone) {
    window.localStorage.setItem(VOLUNTEER_PHONE_STORAGE_KEY, session.phone);
  } else {
    window.localStorage.removeItem(VOLUNTEER_PHONE_STORAGE_KEY);
  }
};
