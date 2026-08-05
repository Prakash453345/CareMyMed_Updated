import React from "react";
import { StyleSheet, View } from "react-native";
import LivingGlassOrb from "../../livingGlass/components/LivingGlassOrb";
import usePatientStore from "../../store/usePatientStore";

export default function ChatFAB({ onPress, bottomOffset = 90 }) {
  // Consistent AI brand theme: vibrant violet/indigo living orb
  const healthStatus = "violet";

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

