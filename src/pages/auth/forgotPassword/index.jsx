import LoginVisualSection from "../components/LoginVisualSection";
import ForgotFormSection from "./ForgotFormSection";

export default function ForgotPassword() {
    return (
        <div className="min-h-screen flex">
            <div className="w-full md:w-[30%] flex flex-col justify-between bg-white min-h-screen">
                <ForgotFormSection />
            </div>
            <LoginVisualSection />
        </div>
        
    );
}