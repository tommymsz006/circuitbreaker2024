export class Utils {
  static truncate(value: string | null, threshold: number) {
    let output: string | null = null;
    if (value != null) {
      if (value.toString().length <= threshold) {
        output = value.toString();
      } else {
        output = value.toString().slice(0, Math.ceil(threshold / 2)) + '...' + value.toString().slice(-1*Math.floor(threshold / 2));
      }
    }
    return output;
  }
}
