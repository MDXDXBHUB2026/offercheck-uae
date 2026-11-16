"use client";

import { Download, Share, X } from "lucide-react";
import { dismissInstallHint, promptInstall, useHintDismissed, useInstallState } from "@/components/shell/install";
import { useT } from "@/components/shell/lang";
import { Button } from "@/components/ui";

// Production hardening Phase 4a (2026-11-16). Where the browser can install the app: an Install app
// button that opens the browser's own install dialog. iPhone and iPad browsers cannot be asked to, so
// there a short hint gives the two taps; in the footer it can be dismissed. Nothing shows by itself
// on arrival, and nothing is sent anywhere.

export const INSTALL_SEPARATE_NOTE =
  "Saved results stay with the browser or the installed app they were saved in.";
export const IOS_INSTALL_STEPS = "To install on iPhone or iPad: tap Share, then Add to Home Screen.";

export function InstallControl({ place }: { place: "settings" | "footer" }) {
  const t = useT();
  const state = useInstallState();
  const dismissed = useHintDismissed();

  if (state === "available") {
    return (
      <div className="stack-sm install-control">
        <Button variant="secondary" onClick={() => void promptInstall()}>
          <Download className="icon" aria-hidden="true" />
          {t("Install app")}
        </Button>
        {place === "settings" && <p className="small muted">{t(INSTALL_SEPARATE_NOTE)}</p>}
      </div>
    );
  }

  if (state === "ios" && (place === "settings" || !dismissed)) {
    return (
      <div className="install-hint" role="note" aria-labelledby={`install-hint-${place}`}>
        <Share className="icon text-green" aria-hidden="true" />
        <div className="stack-sm">
          <p id={`install-hint-${place}`} className="small">
            {t(IOS_INSTALL_STEPS)}
          </p>
          <p className="small muted">{t(INSTALL_SEPARATE_NOTE)}</p>
        </div>
        {place === "footer" && (
          <button type="button" className="icon-button" onClick={dismissInstallHint}>
            <X className="icon" aria-hidden="true" />
            <span className="visually-hidden">{t("Dismiss")}</span>
          </button>
        )}
      </div>
    );
  }

  if (place === "footer") return null;
  return (
    <p className="small muted">
      {state === "installed"
        ? t("Offer Check is installed on this device.")
        : t("This browser does not offer to install the app.")}
    </p>
  );
}
