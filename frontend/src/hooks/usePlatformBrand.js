import { useQuery } from "@tanstack/react-query";
import platformApi from "../api/platformApi";

export const EMPTY_BRAND = Object.freeze({
  productName: "",
  tagline: "",
  companyName: "",
  logo: null,
  primaryColor: "",
  supportEmail: "",
  supportPhone: "",
  website: "",
  poweredByText: "",
});

// The product's own brand (set by the owner). Falls back to empty, in which
// case screens look exactly as before.
export default function usePlatformBrand() {
  const { data } = useQuery({
    queryKey: ["platform-brand"],
    queryFn: async () => (await platformApi.brand()).data?.data,
    staleTime: 10 * 60 * 1000,
    retry: false,
  });
  return { brand: data ? { ...EMPTY_BRAND, ...data } : EMPTY_BRAND };
}
