import { buildCustomOrderMessage } from "./custom-order-message";

describe("buildCustomOrderMessage", () => {
  it("inserts the generated URL into the WhatsApp template", () => {
    expect(buildCustomOrderMessage("https://ozzyclothing.co.id/form-desain/abc0001"))
      .toBe(`Halo Kak,
Kami menyediakan form singkat untuk mencatat kebutuhan desain
https://ozzyclothing.co.id/form-desain/abc0001

Form ini tidak wajib diisi, ya Kak.
Kebutuhan desain tetap bisa disampaikan melalui WhatsApp.

Namun, apabila Kakak berkenan mengisi, form ini akan sangat membantu kami untuk:
- Mempercepat proses desain
- Memahami kebutuhan desain dengan lebih tepat
- Memastikan semua informasi tercatat dan tidak terlewat

Terima kasih, Kak 😊`);
  });
});
