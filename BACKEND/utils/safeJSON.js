export const safeJSONParse = (text) => {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};
