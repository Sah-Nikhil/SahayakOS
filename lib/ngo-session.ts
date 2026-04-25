export const NGO_ID_STORAGE_KEY = "sahayak.ngoId";
export const NGO_EMAIL_STORAGE_KEY = "sahayak.ngoEmail";
export const NGO_NAME_STORAGE_KEY = "sahayak.ngoName";
export const NGO_PHONE_STORAGE_KEY = "sahayak.ngoPhone";

export type NgoSession = {
  ngoId?: string;
  email?: string;
  name?: string;
  phone?: string;
};

export const getNgoSession = (): NgoSession => {
  if (typeof window === "undefined") {
    return {};
  }

  return {
    ngoId: window.localStorage.getItem(NGO_ID_STORAGE_KEY) ?? undefined,
    email: window.localStorage.getItem(NGO_EMAIL_STORAGE_KEY) ?? undefined,
    name: window.localStorage.getItem(NGO_NAME_STORAGE_KEY) ?? undefined,
    phone: window.localStorage.getItem(NGO_PHONE_STORAGE_KEY) ?? undefined,
  };
};

export const setNgoSession = (session: NgoSession) => {
  if (typeof window === "undefined") {
    return;
  }

  if (session.ngoId) {
    window.localStorage.setItem(NGO_ID_STORAGE_KEY, session.ngoId);
  } else {
    window.localStorage.removeItem(NGO_ID_STORAGE_KEY);
  }

  if (session.email) {
    window.localStorage.setItem(NGO_EMAIL_STORAGE_KEY, session.email);
  } else {
    window.localStorage.removeItem(NGO_EMAIL_STORAGE_KEY);
  }

  if (session.name) {
    window.localStorage.setItem(NGO_NAME_STORAGE_KEY, session.name);
  } else {
    window.localStorage.removeItem(NGO_NAME_STORAGE_KEY);
  }

  if (session.phone) {
    window.localStorage.setItem(NGO_PHONE_STORAGE_KEY, session.phone);
  } else {
    window.localStorage.removeItem(NGO_PHONE_STORAGE_KEY);
  }
};
