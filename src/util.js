// Lore = Data + extra features (in this case, a convenient fromEntries())
export class FormLore extends FormData {
  static fromEntries(entries = []) {
    const instance = new FormLore();
    for (const [key, value] of entries) {
      instance.append(key, value);
    }
    return instance;
  }
}
