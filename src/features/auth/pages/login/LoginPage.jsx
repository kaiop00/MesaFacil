import LoginFormSection from "./LoginFormSection";
import LoginVisualSection from "@/features/auth/components/LoginVisualSection";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex">
      <div className="w-full md:w-[30%] flex flex-col justify-between bg-white min-h-screen">
        <LoginFormSection />
      </div>
      <LoginVisualSection />
    </div>
  );
}
