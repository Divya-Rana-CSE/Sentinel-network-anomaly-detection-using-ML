'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Shield, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/contexts/auth-context'
import { validateEmail, validatePassword, validateFullName, validatePasswordMatch, getPasswordStrengthColor, getPasswordStrengthText } from '@/lib/validation'

export default function SignupPage() {
  const router = useRouter()
  const { signup } = useAuth()
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  const [passwordStrength, setPasswordStrength] = useState<'weak' | 'fair' | 'good' | 'strong' | null>(null)
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }

    // Update password strength indicator
    if (name === 'password') {
      const validation = validatePassword(value)
      setPasswordStrength(validation.strength || null)
    }
  }

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {}

    // Validate full name
    const nameValidation = validateFullName(formData.fullName)
    if (!nameValidation.valid) {
      newErrors.fullName = nameValidation.error || 'Invalid name'
    }

    // Validate email
    const emailValidation = validateEmail(formData.email)
    if (!emailValidation.valid) {
      newErrors.email = emailValidation.error || 'Invalid email'
    }

    // Validate password
    const passwordValidation = validatePassword(formData.password)
    if (!passwordValidation.valid) {
      newErrors.password = passwordValidation.error || 'Invalid password'
    }

    // Validate password match
    const matchValidation = validatePasswordMatch(formData.password, formData.confirmPassword)
    if (!matchValidation.valid) {
      newErrors.confirmPassword = matchValidation.error || 'Passwords do not match'
    }

    // Validate terms
    if (!agreedToTerms) {
      newErrors.terms = 'You must agree to the terms and conditions'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setIsLoading(true)

    // Attempt signup
    const result = await signup(formData.fullName, formData.email, formData.password)

    if (result.success) {
      // Redirect to login page
      router.push('/login?registered=true')
    } else {
      setErrors({ submit: result.error || 'Signup failed. Please try again.' })
    }

    setIsLoading(false)
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-8">
      {/* Background Glow Effects */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-0 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-400 to-cyan-400 flex items-center justify-center">
              <Shield className="w-7 h-7 text-gray-900" />
            </div>
          </div>
          <h1 className="text-3xl font-bold mb-2 glow-neon-blue">SENTINEL</h1>
          <p className="text-muted-foreground">Create Your Account</p>
        </div>

        {/* Signup Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Submit Error */}
          {errors.submit && (
            <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/30 flex items-gap-2">
              <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
              <p className="text-sm text-destructive ml-2">{errors.submit}</p>
            </div>
          )}

          {/* Full Name Field */}
          <div className="space-y-2">
            <Label htmlFor="fullName" className="text-sm font-medium">
              Full Name
            </Label>
            <Input
              id="fullName"
              name="fullName"
              type="text"
              placeholder="John Doe"
              value={formData.fullName}
              onChange={handleChange}
              disabled={isLoading}
              className="bg-secondary/50 border-border focus:glow-border-blue transition-all"
            />
            {errors.fullName && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {errors.fullName}
              </p>
            )}
          </div>

          {/* Email Field */}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium">
              Email Address
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="you@example.com"
              value={formData.email}
              onChange={handleChange}
              disabled={isLoading}
              className="bg-secondary/50 border-border focus:glow-border-blue transition-all"
            />
            {errors.email && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {errors.email}
              </p>
            )}
          </div>

          {/* Password Field */}
          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium">
              Password
            </Label>
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                disabled={isLoading}
                className="bg-secondary/50 border-border focus:glow-border-blue transition-all pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>

            {/* Password Strength Indicator */}
            {formData.password && passwordStrength && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                    <div
                      className={`h-full ${getPasswordStrengthColor(passwordStrength)} transition-all`}
                      style={{
                        width: passwordStrength === 'weak' ? '25%' : passwordStrength === 'fair' ? '50%' : passwordStrength === 'good' ? '75%' : '100%',
                      }}
                    />
                  </div>
                  <span className="text-xs font-medium text-muted-foreground min-w-fit">
                    {getPasswordStrengthText(passwordStrength)}
                  </span>
                </div>
              </div>
            )}

            {errors.password && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {errors.password}
              </p>
            )}
          </div>

          {/* Confirm Password Field */}
          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-sm font-medium">
              Confirm Password
            </Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={formData.confirmPassword}
                onChange={handleChange}
                disabled={isLoading}
                className="bg-secondary/50 border-border focus:glow-border-blue transition-all pr-10"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showConfirmPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {errors.confirmPassword}
              </p>
            )}
          </div>

          {/* Terms & Conditions */}
          <div className="space-y-2">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => {
                  setAgreedToTerms(e.target.checked)
                  if (errors.terms) {
                    setErrors(prev => ({ ...prev, terms: '' }))
                  }
                }}
                disabled={isLoading}
                className="rounded border-border mt-1"
              />
              <span className="text-xs text-muted-foreground">
                I agree to the{' '}
                <Link href="/terms" target="_blank" className="text-primary hover:text-primary/80 underline">
                  Terms and Conditions
                </Link>{' '}
                and{' '}
                <Link href="/privacy" target="_blank" className="text-primary hover:text-primary/80 underline">
                  Privacy Policy
                </Link>
              </span>
            </label>
            {errors.terms && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {errors.terms}
              </p>
            )}
          </div>

          {/* Signup Button */}
          <Button
            type="submit"
            disabled={isLoading}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground mt-6 glow-box-blue"
          >
            {isLoading ? 'Creating Account...' : 'Create Account'}
          </Button>
        </form>

        {/* Login Link */}
        <p className="text-center text-sm text-muted-foreground mt-6">
          Already have an account?{' '}
          <Link href="/login" className="text-primary hover:text-primary/80 transition-colors font-medium">
            Sign in here
          </Link>
        </p>
      </div>
    </div>
  )
}
