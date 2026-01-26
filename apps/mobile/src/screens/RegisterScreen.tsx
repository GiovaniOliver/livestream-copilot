/**
 * Registration Screen
 *
 * Enhanced registration with:
 * - Email/password registration
 * - Real-time password strength validation
 * - Email validation feedback
 * - Better error messages
 * - Loading states and animations
 */

import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
  Animated,
} from "react";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useAuthStore } from "../stores/authStore";
import { useConnectionStore } from "../stores/connectionStore";
import { colors } from "../theme";

interface RegisterScreenProps {
  onLoginPress: () => void;
  onSuccess: () => void;
}

export default function RegisterScreen({
  onLoginPress,
  onSuccess,
}: RegisterScreenProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [nameError, setNameError] = useState("");

  const { register, isLoading, error, clearError } = useAuthStore();
  const { baseUrl } = useConnectionStore();

  // Password strength validation with detailed requirements
  const passwordStrength = useMemo(() => {
    if (password.length === 0) {
      return { score: 0, message: "", requirements: {} };
    }

    const requirements = {
      length: password.length >= 12,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[^A-Za-z0-9]/.test(password),
    };

    const score = Object.values(requirements).filter(Boolean).length;

    let message = "";
    if (score < 2) message = "Very weak";
    else if (score < 3) message = "Weak";
    else if (score < 4) message = "Fair";
    else if (score < 5) message = "Good";
    else message = "Strong";

    return { score, message, requirements };
  }, [password]);

  // Email validation
  const validateEmail = useCallback((email: string) => {
    if (!email) {
      setEmailError("");
      return false;
    }

    // RFC 5322 simplified email regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setEmailError("Please enter a valid email address");
      return false;
    }

    // Additional checks
    if (email.length > 254) {
      setEmailError("Email address is too long");
      return false;
    }

    const [localPart, domain] = email.split("@");
    if (localPart.length > 64) {
      setEmailError("Email address is invalid");
      return false;
    }

    setEmailError("");
    return true;
  }, []);

  // Name validation
  const validateName = useCallback((name: string) => {
    if (!name.trim()) {
      setNameError("");
      return false;
    }

    if (name.trim().length < 2) {
      setNameError("Name must be at least 2 characters");
      return false;
    }

    if (name.trim().length > 100) {
      setNameError("Name is too long");
      return false;
    }

    setNameError("");
    return true;
  }, []);

  const handleEmailChange = useCallback(
    (text: string) => {
      setEmail(text);
      if (text) {
        validateEmail(text);
      } else {
        setEmailError("");
      }
    },
    [validateEmail]
  );

  const handleNameChange = useCallback(
    (text: string) => {
      setName(text);
      if (text) {
        validateName(text);
      } else {
        setNameError("");
      }
    },
    [validateName]
  );

  const handleRegister = useCallback(async () => {
    clearError();

    // Validate name
    if (!validateName(name)) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Invalid Name", nameError || "Please enter your name");
      return;
    }

    // Validate email
    if (!validateEmail(email)) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Invalid Email", emailError || "Please enter a valid email address");
      return;
    }

    // Validate password length
    if (!passwordStrength.requirements.length) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Weak Password", "Password must be at least 12 characters");
      return;
    }

    // Validate password strength
    if (passwordStrength.score < 3) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        "Weak Password",
        "Please use a stronger password with uppercase, lowercase, numbers, and special characters"
      );
      return;
    }

    // Validate password match
    if (password !== confirmPassword) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Passwords Don't Match", "Please make sure both passwords are the same");
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      await register(email.trim(), password, name.trim(), baseUrl);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      Alert.alert(
        "Check Your Email",
        "We've sent you a verification link. Please verify your email to continue.",
        [{ text: "OK", onPress: onSuccess }]
      );
    } catch (err) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }, [
    name,
    email,
    password,
    confirmPassword,
    passwordStrength,
    baseUrl,
    register,
    onSuccess,
    validateEmail,
    validateName,
    emailError,
    nameError,
  ]);

  const getStrengthColor = (score: number) => {
    const colors = ["#EF4444", "#F59E0B", "#FBBF24", "#10B981", "#06B6D4"];
    return colors[score] || "#6B7280";
  };

  const passwordMismatch = confirmPassword.length > 0 && password !== confirmPassword;

  return (
    <LinearGradient colors={[colors.bg0, colors.bg1]} style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Join FluxBoard and start creating</Text>
          </View>

          {/* Error Message */}
          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity onPress={clearError}>
                <Text style={styles.errorDismiss}>Dismiss</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Name Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Name</Text>
            <TextInput
              style={[styles.input, nameError ? styles.inputError : null]}
              value={name}
              onChangeText={handleNameChange}
              placeholder="Your name"
              placeholderTextColor={colors.textMuted}
              autoComplete="name"
              editable={!isLoading}
            />
            {nameError && <Text style={styles.validationError}>{nameError}</Text>}
          </View>

          {/* Email Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={[styles.input, emailError ? styles.inputError : null]}
              value={email}
              onChangeText={handleEmailChange}
              placeholder="you@example.com"
              placeholderTextColor={colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              editable={!isLoading}
            />
            {emailError && <Text style={styles.validationError}>{emailError}</Text>}
          </View>

          {/* Password Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={[styles.input, styles.passwordInput]}
                value={password}
                onChangeText={setPassword}
                placeholder="Min 12 characters"
                placeholderTextColor={colors.textMuted}
                secureTextEntry={!showPassword}
                autoComplete="new-password"
                editable={!isLoading}
              />
              <TouchableOpacity
                style={styles.showPasswordBtn}
                onPress={() => setShowPassword(!showPassword)}
                disabled={isLoading}
              >
                <Text style={styles.showPasswordText}>
                  {showPassword ? "Hide" : "Show"}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Password Strength Indicator */}
            {password.length > 0 && (
              <View style={styles.strengthContainer}>
                <View style={styles.strengthBars}>
                  {[0, 1, 2, 3, 4].map((level) => (
                    <View
                      key={level}
                      style={[
                        styles.strengthBar,
                        {
                          backgroundColor:
                            level < passwordStrength.score
                              ? getStrengthColor(passwordStrength.score)
                              : "rgba(255,255,255,0.1)",
                        },
                      ]}
                    />
                  ))}
                </View>
                <Text
                  style={[
                    styles.strengthText,
                    { color: getStrengthColor(passwordStrength.score) },
                  ]}
                >
                  {passwordStrength.message}
                </Text>
              </View>
            )}

            {/* Password Requirements */}
            {password.length > 0 && (
              <View style={styles.requirementsContainer}>
                <PasswordRequirement
                  met={passwordStrength.requirements.length}
                  text="At least 12 characters"
                />
                <PasswordRequirement
                  met={passwordStrength.requirements.uppercase}
                  text="One uppercase letter"
                />
                <PasswordRequirement
                  met={passwordStrength.requirements.lowercase}
                  text="One lowercase letter"
                />
                <PasswordRequirement
                  met={passwordStrength.requirements.number}
                  text="One number"
                />
                <PasswordRequirement
                  met={passwordStrength.requirements.special}
                  text="One special character"
                />
              </View>
            )}
          </View>

          {/* Confirm Password Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Confirm Password</Text>
            <TextInput
              style={[styles.input, passwordMismatch && styles.inputError]}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Confirm your password"
              placeholderTextColor={colors.textMuted}
              secureTextEntry={!showPassword}
              editable={!isLoading}
            />
            {passwordMismatch && (
              <Text style={styles.validationError}>Passwords don't match</Text>
            )}
          </View>

          {/* Register Button */}
          <TouchableOpacity
            style={[styles.registerButton, isLoading && styles.registerButtonDisabled]}
            onPress={handleRegister}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color={colors.bg0} />
            ) : (
              <Text style={styles.registerButtonText}>Create Account</Text>
            )}
          </TouchableOpacity>

          {/* Terms */}
          <Text style={styles.terms}>
            By creating an account, you agree to our{" "}
            <Text style={styles.termsLink}>Terms of Service</Text> and{" "}
            <Text style={styles.termsLink}>Privacy Policy</Text>
          </Text>

          {/* Login Link */}
          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <TouchableOpacity onPress={onLoginPress} disabled={isLoading}>
              <Text style={styles.loginLink}>Sign in</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

// Password requirement indicator component
function PasswordRequirement({ met, text }: { met: boolean; text: string }) {
  return (
    <View style={styles.requirement}>
      <Text style={[styles.requirementDot, met && styles.requirementDotMet]}>
        {met ? "✓" : "○"}
      </Text>
      <Text style={[styles.requirementText, met && styles.requirementTextMet]}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
  },
  header: {
    alignItems: "center",
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textMuted,
    textAlign: "center",
  },
  errorContainer: {
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
  },
  errorText: {
    color: "#EF4444",
    flex: 1,
    marginRight: 12,
    fontSize: 14,
  },
  errorDismiss: {
    color: "#EF4444",
    fontWeight: "600",
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 12,
    padding: 16,
    color: colors.text,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
  },
  inputError: {
    borderColor: "#EF4444",
  },
  validationError: {
    color: "#EF4444",
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  passwordContainer: {
    position: "relative",
  },
  passwordInput: {
    paddingRight: 60,
  },
  showPasswordBtn: {
    position: "absolute",
    right: 16,
    top: 16,
  },
  showPasswordText: {
    color: colors.teal,
    fontWeight: "500",
  },
  strengthContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    gap: 12,
  },
  strengthBars: {
    flexDirection: "row",
    gap: 4,
  },
  strengthBar: {
    width: 32,
    height: 4,
    borderRadius: 2,
  },
  strengthText: {
    fontSize: 12,
    fontWeight: "500",
  },
  requirementsContainer: {
    marginTop: 12,
    gap: 6,
  },
  requirement: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  requirementDot: {
    color: colors.textMuted,
    fontSize: 14,
    width: 16,
  },
  requirementDotMet: {
    color: "#10B981",
  },
  requirementText: {
    color: colors.textMuted,
    fontSize: 12,
  },
  requirementTextMet: {
    color: colors.text,
  },
  registerButton: {
    backgroundColor: colors.teal,
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginTop: 8,
    shadowColor: colors.teal,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  registerButtonDisabled: {
    opacity: 0.7,
  },
  registerButtonText: {
    color: colors.bg0,
    fontSize: 16,
    fontWeight: "600",
  },
  terms: {
    color: colors.textMuted,
    fontSize: 12,
    textAlign: "center",
    marginTop: 16,
    lineHeight: 18,
  },
  termsLink: {
    color: colors.teal,
  },
  loginContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 24,
  },
  loginText: {
    color: colors.textMuted,
  },
  loginLink: {
    color: colors.teal,
    fontWeight: "600",
  },
});
