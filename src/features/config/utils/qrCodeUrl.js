const isLocalHost = (hostname = "") => {
    const normalized = String(hostname || "").toLowerCase();
    return normalized === "localhost" || normalized === "127.0.0.1" || normalized.endsWith(".local");
};

export const resolveQrCodeUrl = (storedUrl, fallbackPath = "") => {
    const currentOrigin = typeof window !== "undefined" ? window.location.origin : "";

    if (typeof window === "undefined") {
        return storedUrl || fallbackPath || "";
    }

    if (storedUrl) {
        try {
            const parsedUrl = new URL(storedUrl, currentOrigin || window.location.origin);

            if (isLocalHost(window.location.hostname)) {
                return `${window.location.origin}${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`;
            }

            return parsedUrl.toString();
        } catch {
            return storedUrl;
        }
    }

    if (!fallbackPath) {
        return currentOrigin;
    }

    return `${currentOrigin}${fallbackPath}`;
};