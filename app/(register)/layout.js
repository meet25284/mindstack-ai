import "../globals.css";



export const metadata = {
  title: "Mindstack AI",
  description: "It's an RAG app which gives response according to its knowledge base",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
