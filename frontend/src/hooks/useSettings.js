import { useContext } from "react";
import { SettingsContext } from "../contexts/SettingsContext";

const useSettings = () => {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
  return ctx;
};

export default useSettings;
