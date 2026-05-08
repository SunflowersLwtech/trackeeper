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
        marginTop: 14,
        padding: 14,
        borderRadius: 16,
        backgroundColor: c.surface,
        borderWidth: 1,
        borderColor: c.borderLight,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}>
        <Ionicons name="calculator-outline" size={18} color={c.primary} />
        <Text style={{ marginLeft: 8, fontSize: 14, fontWeight: "700", color: c.text }}>
          Cost breakdown
        </Text>
      </View>

      <View style={{ flexDirection: "row" }}>
        <NumberField label="Hours" value={laborHours} onChangeText={setLaborHours} colors={c} testID="cost-labor-hours" />
        <View style={{ width: 8 }} />
        <NumberField label="Rate (RM/h)" value={hourlyRate} onChangeText={setHourlyRate} colors={c} testID="cost-hourly-rate" />
        <View style={{ width: 8 }} />
        <NumberField label="Materials" value={materialCost} onChangeText={setMaterialCost} colors={c} testID="cost-material" />
      </View>

      {/* Live preview */}
      <View
        style={{
          marginTop: 10,
          padding: 10,
          backgroundColor: c.background,
          borderRadius: 10,
          borderWidth: 1,
          borderColor: c.borderLight,
        }}
      >
        <RowLine label={`Labor (${lh}h × RM${hr.toFixed(0)})`} value={`RM ${labor.toFixed(2)}`} colors={c} />
        <RowLine label="Materials" value={`RM ${mc.toFixed(2)}`} colors={c} />
        <View style={{ height: 1, backgroundColor: c.borderLight, marginVertical: 6 }} />
        <RowLine label="Total" value={`RM ${total.toFixed(2)}`} bold colors={c} />
      </View>

      <TouchableOpacity
        style={{
          marginTop: 12,
          backgroundColor: saving ? c.primaryLight : c.primary,
          paddingVertical: 12,
          borderRadius: 12,
          alignItems: "center",
        }}
        onPress={() => onSave(lh, hr, mc)}
        disabled={saving}
        accessibilityRole="button"
        accessibilityLabel="Save cost breakdown"
        testID="cost-save-button"
      >
        {saving ? (
          <ActivityIndicator color={c.background} />
        ) : (
          <Text style={{ color: c.background, fontWeight: "700", fontSize: 13 }}>
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
      <Text style={{ fontSize: 11, fontWeight: "600", color: c.textTertiary, marginBottom: 4 }}>
        {label}
      </Text>
      <TextInput
        style={{
          borderWidth: 1,
          borderColor: c.border,
          borderRadius: 10,
          paddingHorizontal: 10,
          paddingVertical: 10,
          color: c.text,
          fontSize: 14,
          backgroundColor: c.background,
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
  colors: ReturnType<typeof useColors>;
}

function RowLine({ label, value, bold, colors: c }: RowLineProps) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 2 }}>
      <Text style={{ fontSize: 12, fontWeight: bold ? "800" : "500", color: bold ? c.text : c.textTertiary }}>
        {label}
      </Text>
      <Text style={{ fontSize: bold ? 15 : 12, fontWeight: bold ? "800" : "600", color: bold ? c.primary : c.text }}>
        {value}
      </Text>
    </View>
  );
}
