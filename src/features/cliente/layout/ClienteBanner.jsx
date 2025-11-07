import { useEffect, useRef } from "react";

export default function ClienteBanner() {
    const adLoaded = useRef(false);

    useEffect(() => {
        // Prevent multiple initializations
        if (adLoaded.current) return;

        const loadAd = () => {
            try {
                (window.adsbygoogle = window.adsbygoogle || []).push({});
                adLoaded.current = true;
            } catch (e) {
                console.error("AdSense error:", e);
            }
        };

        // Check if script already exists
        const existingScript = document.querySelector(
            'script[src*="adsbygoogle.js"]'
        );

        if (existingScript) {
            // Script already loaded, just push the ad
            loadAd();
        } else {
            // Load script first, then push ad
            const script = document.createElement("script");
            script.src = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5751291910420110";
            script.async = true;
            script.crossOrigin = "anonymous";
            script.onload = loadAd;
            document.head.appendChild(script);
        }
    }, []);

    return (
        <div className="w-full max-h-[131px] overflow-hidden">
            {/* Anuncio Teste */}
            <ins
                className="adsbygoogle"
                style={{ display: "block" }}
                data-ad-client="ca-pub-5751291910420110"
                data-ad-slot="6094068428"
                data-ad-format="auto"
                data-full-width-responsive="true"
            />
        </div>
    );
}