import React from "react";
import { StyleSheet, View } from "react-native";
import LivingGlassOrb from "../../livingGlass/components/LivingGlassOrb";
import usePatientStore from "../../store/usePatientStore";

export default function ChatFAB({ onPress, bottomOffset = 90 }) {
  const adherenceDetails = usePatientStore((state) => state.adherenceDetails);
  const adherenceRate = adherenceDetails?.rate ?? 100;

  // Context-aware health spectrum: emerald if 100% adherence, amber if low, violet default
  let healthStatus = "violet";
  if (adherenceRate >= 100) healthStatus = "emerald";
  else if (adherenceRate < 70) healthStatus = "amber";

  return (
    <View style={[styles.container, { bottom: bottomOffset }]}>
      <LivingGlassOrb
        size={58}
        healthStatus={healthStatus}
        onPress={onPress}
        sharedId="home_glass_orb"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    right: 16,
    zIndex: 999,
    alignItems: "center",
    justifyContent: "center",
  },
});

