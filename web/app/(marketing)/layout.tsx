import { Footer } from "@/components/marketing/footer";
import { Header } from "@/components/marketing/header";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mesh-bg min-h-screen">
      <Header />
      <main>{children}</main>
      <Footer />
    </div>
  );
}
