import { useEffect, useState } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { subscribeToasts, type ToastMessage } from "@/lib/toast";
import { Toast } from "@/components/feedback/Toast";

export function ToastHost() {
  const insets = useSafeAreaInsets();
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  useEffect(
    () => subscribeToasts((t) => setToasts((old) => [...old, t].slice(-3))),
    [],
  );
  return (
    <View
      pointerEvents="box-none"
      style={{
        position: "absolute",
        left: 14,
        right: 14,
        top: insets.top + 8,
        gap: 8,
        zIndex: 2000,
      }}
    >
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast}
          onDismiss={() =>
            setToasts((old) => old.filter((t) => t.id !== toast.id))
          }
        />
      ))}
    </View>
  );
}
