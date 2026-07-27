import GlobalErrorListener from "@/components/GlobalErrorListener";
import "../globals.css"


export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <GlobalErrorListener />
        {children}
      </body>
    </html>
  );
}