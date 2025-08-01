import Banner from "@/assets/banner.svg";

export default function ClienteBanner() {
    return (
        <div className="">
            <img src={Banner} alt="banner" className="w-full max-h-[131px] object-cover" />
        </div>
    )
}