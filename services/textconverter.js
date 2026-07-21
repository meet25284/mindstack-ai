import mammoth from "mammoth";
import PdfParse from "pdf-parse";

export const textconverter = async (file, buffer) => {
    const chunkSize = 500
    const overlap = 100
    switch (file.type) {
        case "application/pdf":
            const pdftext = await PdfParse(buffer)
            const pdfchunks = [];

            for (let i = 0; i < pdftext.text.length; i += chunkSize - overlap) {
                pdfchunks.push(pdftext.text.slice(i, i + chunkSize));
            }
            return pdfchunks

        case "text/plain":
            const text = await file.text()
            const textchunks = [];

            for (let i = 0; i < text.length; i += chunkSize - overlap) {
                textchunks.push(text.slice(i, i + chunkSize));
            }
            return textchunks

        case "text/markdown":
            const mdtotext = await file.text()
            const mdchunks = [];

            for (let i = 0; i < mdtotext.length; i += chunkSize - overlap) {
                mdchunks.push(mdtotext.slice(i, i + chunkSize));
            }
            return mdchunks

        case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
            const doctext = await mammoth.extractRawText({ buffer })
            const docchunks = [];

            for (let i = 0; i < doctext.value.length; i += chunkSize - overlap) {
                docchunks.push(doctext.value.slice(i, i + chunkSize));
            }
            return docchunks
        default:
            throw new Error("Unsupported file type");
    }
}
