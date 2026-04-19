import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';

/**
 * Consistent in-app confirmation dialog.
 * Replaces native Alert.alert for all destructive / confirmable actions.
 *
 * Props:
 *   visible      – boolean
 *   title        – string
 *   message      – string (optional)
 *   confirmText  – string (default 'Confirm')
 *   cancelText   – string (default 'Cancel')
 *   destructive  – boolean — red confirm button (default true)
 *   onConfirm    – () => void
 *   onCancel     – () => void
 */
export default function ConfirmDialog({
  visible,
  title,
  message,
  confirmText = 'Confirm',
  cancelText  = 'Cancel',
  destructive = true,
  onConfirm,
  onCancel,
}) {
  const { theme: t } = useTheme();
  const confirmBg = destructive ? t.error : t.primary;

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onCancel}>
      <View style={s.backdrop}>
        <View style={[s.card, { backgroundColor: t.bgSecondary, borderColor: t.border }]}>
          <Text style={[s.title, { color: t.text }]}>{title}</Text>
          {message ? <Text style={[s.message, { color: t.textSecondary }]}>{message}</Text> : null}
          <View style={s.btnRow}>
            <TouchableOpacity
              style={[s.btn, { backgroundColor: t.surface, borderColor: t.border }]}
              onPress={onCancel}
              activeOpacity={0.75}
            >
              <Text style={[s.btnText, { color: t.textSecondary }]}>{cancelText}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.btn, { backgroundColor: confirmBg }]}
              onPress={onConfirm}
              activeOpacity={0.75}
            >
              <Text style={[s.btnText, { color: '#fff' }]}>{confirmText}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.88)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  card: {
    width: '100%',
    borderRadius: 22,
    borderWidth: 1,
    padding: 28,
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 24,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  btn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  btnText: {
    fontSize: 15,
    fontWeight: '800',
  },
});
