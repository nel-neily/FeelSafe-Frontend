const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export const utilFetch = async (url, method = "GET", body = { null: null }) => {
  const response = await fetch(`${BACKEND_URL}${url}`, {
    method,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await response.json();
  return data;
};

export const utilGetFetch = async (url) => {
  const response = await fetch(`${BACKEND_URL}${url}`);
  const data = await response.json();
  return data;
};
