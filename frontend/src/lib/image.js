/*
 * Shrinks a picked image to a JPEG data URL small enough to store with a
 * session (the server accepts up to about 750 KB). Scoreboard screenshots
 * stay readable at 1280px wide.
 */
const MAX_CHARS = 900_000;

export async function fileToDataUrl(file) {
    if (!file.type.startsWith("image/")) throw new Error("Pick an image file.");
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 1280 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    for (const quality of [0.82, 0.7, 0.55, 0.4]) {
        const url = canvas.toDataURL("image/jpeg", quality);
        if (url.length <= MAX_CHARS) return url;
    }
    throw new Error("That image is too large even after shrinking.");
}
