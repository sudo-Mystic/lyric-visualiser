import { createRoot } from "react-dom/client";
import "@fontsource-variable/geist";
import "@fontsource-variable/geist-mono";
import "@fontsource-variable/jetbrains-mono";
import "@fontsource-variable/noto-sans";
import "@fontsource-variable/noto-sans-devanagari";
import "@fontsource/kalam/400.css";
import "@fontsource/kalam/700.css";
import "@fontsource/rozha-one/400.css";
import "@fontsource/yatra-one/400.css";
import "./index.css";
import App from "./App";

createRoot(document.getElementById("root")!).render(<App />);
