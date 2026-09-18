"use client"

import { useEffect, useState } from "react"
import { IphoneFrame } from "./iphone-frame"
import { SplashScreen } from "./splash-screen"
import { WhatsAppChat } from "./whatsapp-chat"

export function WhatsAppPhone() {
  const [hidingSplash, setHidingSplash] = useState(false)
  const [splashDone, setSplashDone] = useState(false)

  useEffect(() => {
    const hideTimer = setTimeout(() => setHidingSplash(true), 2200)
    const doneTimer = setTimeout(() => setSplashDone(true), 3000)
    return () => {
      clearTimeout(hideTimer)
      clearTimeout(doneTimer)
    }
  }, [])

  return (
    <IphoneFrame>
      <div className="relative h-full w-full overflow-hidden">
        <div
          className={`h-full w-full transition-all duration-700 ${
            hidingSplash
              ? "translate-y-0 opacity-100"
              : "translate-y-3 opacity-0"
          }`}
        >
          <WhatsAppChat />
        </div>
        {!splashDone && <SplashScreen hiding={hidingSplash} />}
      </div>
    </IphoneFrame>
  )
}
