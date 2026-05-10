import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { palette } from "@/constants/Colors";
import { FONT, BORDER, RADIUS, SHADOW_SM, SHADOW_MD } from "@/constants/Brutalism";
import { computeCostTotal } from "@/services/payments";
import { RequestCost } from "@/types";

interface Props {
  initial?: Partial<RequestCost>;
  defaultHourlyRate?: number;
  onSave: (laborHours: number, hourlyRate: number, materialCost: number) => Promise<void>;
  saving?: boolean;
}

export function CostBreakdownEditor({ initial, defaultHourlyRate = 80, onSave, saving = false }: Props) {
  const c = useColors();
  const [laborHours, setLaborHours] = useState(String(initial?.laborHours ?? 1));
  const [hourlyRate, setHourlyRate] = useState(String(initial?.hourlyRate ?? defaultHourlyRate));
  const [materialCost, setMaterialCost] = useState(String(initial?.materialCost ?? 0));

  useEffect(() => {
    if (initial) {
      setLaborHours(String(initial.laborHours ?? 1));
      setHourlyRate(String(initial.hourlyRate ?? defaultHourlyRate));
      setMaterialCost(String(initial.materialCost ?? 0));
    }
  }, [initial, defaultHourlyRate]);

  const lh = Math.max(0, parseFloat(laborHours) || 0);
  const hr = Math.max(0, parseFloat(hourlyRate) || 0);
  const mc = Math.max(0, parseFloat(materialCost) || 0);
  const total = computeCostTotal(lh, hr, mc);
  const labor = lh * hr;

  return (
    <View
      style={{
        marginTop: 16,
        padding: 16,
        borderRadius: RADIUS.sm,
        backgroundColor: c.surface,
        borderWidth: BORDER.heavy,
        borderColor: palette.ink,
        ...SHADOW_MD,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 14 }}>
        <View
          style={{
            width: 30,
            height: 30,
            backgroundColor: palette.cobalt500,
            borderWidth: BORDER.base,
            borderColor: palette.ink,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="calculator" size={18} color={palette.paper} />
        </View>
        <Text
          style={{
            marginLeft: 10,
            fontFamily: FONT.display,
            fontSize: 15,
            fontWeight: "900",
            letterSpacing: 0.4,
            color: c.text,
            textTransform: "uppercase",
          }}
        >
          Cost breakdown
        </Text>
      </View>

      <View style={{ flexDirection: "row", gap: 8 }}>
        <NumberField label="HOURS" value={laborHours} onChangeText={setLaborHours} colors={c} testID="cost-labor-hours" />
        <NumberField label="RATE RM/H" value={hourlyRate} onChangeText={setHourlyRate} colors={c} testID="cost-hourly-rate" />
        <NumberField label="MATERIALS" value={materialCost} onChangeText={setMaterialCost} colors={c} testID="cost-material" />
      </View>

      {/* Live preview receipt */}
      <View
        style={{
          marginTop: 14,
          padding: 12,
          backgroundColor: palette.cream100,
          borderWidth: BORDER.base,
          borderColor: palette.ink,
        }}
      >
        <RowLine label={`Labor · ${lh}h × RM${hr.toFixed(0)}`} value={`RM ${labor.toFixed(2)}`} />
        <RowLine label="Materials" value={`RM ${mc.toFixed(2)}`} />
        <View style={{ height: BORDER.base, backgroundColor: palette.ink, marginVertical: 8 }} />
        <RowLine label="TOTAL" value={`RM ${total.toFixed(2)}`} bold />
      </View>

      <TouchableOpacity
        style={{
          marginTop: 14,
          backgroundColor: saving ? palette.cobalt300 : palette.lime500,
          borderWidth: BORDER.base,
          borderColor: palette.ink,
          paddingVertical: 14,
          alignItems: "center",
          ...SHADOW_SM,
        }}
        onPress={() => onSave(lh, hr, mc)}
        disabled={saving}
        accessibilityRole="button"
        accessibilityLabel="Save cost breakdown"
        testID="cost-save-button"
      >
        {saving ? (
          <ActivityIndicator color={palette.ink} />
        ) : (
          <Text
            style={{
              color: palette.ink,
              fontFamily: FONT.display,
              fontSize: 13,
              fontWeight: "900",
              letterSpacing: 0.6,
              textTransform: "uppercase",
            }}
          >
            {initial ? "Update cost" : "Set cost"}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

interface NumberFieldProps {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  colors: ReturnType<typeof useColors>;
  testID?: string;
}

function NumberField({ label, value, onChangeText, colors: c, testID }: NumberFieldProps) {
  return (
    <View style={{ flex: 1 }}>
      <Text
        style={{
          fontFamily: FONT.display,
          fontSize: 10,
          fontWeight: "900",
          color: c.text,
          marginBottom: 5,
          letterSpacing: 0.6,
        }}
      >
        {label}
      </Text>
      <TextInput
        style={{
          borderWidth: BORDER.base,
          borderColor: palette.ink,
          paddingHorizontal: 10,
          paddingVertical: 10,
          color: c.text,
          fontFamily: FONT.mono,
          fontSize: 15,
          fontWeight: "700",
          backgroundColor: c.surface,
        }}
        value={value}
        onChangeText={(t) => onChangeText(t.replace(/[^0-9.]/g, ""))}
        keyboardType="decimal-pad"
        accessibilityLabel={label}
        testID={testID}
      />
    </View>
  );
}

interface RowLineProps {
  label: string;
  value: string;
  bold?: boolean;
}

function RowLine({ label, value, bold }: RowLineProps) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 3 }}>
      <Text
        style={{
          fontFamily: bold ? FONT.display : FONT.body,
          fontSize: bold ? 14 : 12,
          fontWeight: bold ? "900" : "500",
          letterSpacing: bold ? 0.6 : 0,
          color: palette.ink,
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          fontFamily: bold ? FONT.display : FONT.mono,
          fontSize: bold ? 18 : 12,
          fontWeight: bold ? "900" : "700",
          color: bold ? palette.cobalt500 : palette.ink,
          letterSpacing: bold ? -0.4 : 0,
        }}
      >
        {value}
      </Text>
    </View>
  );
}
