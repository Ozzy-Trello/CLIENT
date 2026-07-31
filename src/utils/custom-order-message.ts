export function buildCustomOrderMessage(url: string): string {
  return [
    "Halo Kak,",
    "Kami menyediakan form singkat untuk mencatat kebutuhan desain",
    url,
    "",
    "Form ini tidak wajib diisi, ya Kak.",
    "Kebutuhan desain tetap bisa disampaikan melalui WhatsApp.",
    "",
    "Namun, apabila Kakak berkenan mengisi, form ini akan sangat membantu kami untuk:",
    "- Mempercepat proses desain",
    "- Memahami kebutuhan desain dengan lebih tepat",
    "- Memastikan semua informasi tercatat dan tidak terlewat",
    "",
    "Terima kasih, Kak 😊",
  ].join("\n");
}
