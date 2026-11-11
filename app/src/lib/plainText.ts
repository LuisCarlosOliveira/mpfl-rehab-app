/** Text from a file as plain text: control, zero-width and direction characters out. React escapes the rest when it shows. */
export const stripHidden = (text: string): string => text.replace(/[\u0000-\u001f\u007f-\u009f​-‏‪-‮⁦-⁩]/g, '');
