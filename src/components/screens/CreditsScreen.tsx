import React, { useState, useEffect } from 'react'
import { Button } from '../ui/Button'
import { BottomNavigation } from '../ui/BottomNavigation'
import { ScreenProps, CreditPackage, CreditPurchase, CreditTransaction } from '../../types'
import { ArrowLeft, Plus, Gift, CreditCard, Star, Clock, CheckCircle, XCircle, Upload, DollarSign } from 'lucide-react'
import { FadeIn, ScaleButton } from '../ui/VisualPolish'
import { useApi } from '../../utils/api'
import { useToast } from '../../contexts/ToastContext'

interface CreditsScreenProps extends ScreenProps {}

export const CreditsScreen: React.FC<CreditsScreenProps> = ({
  navigateTo,
  appState,
}) => {
  const { showToast } = useToast()
  const { getCurrentUser, getCreditPackages, getCreditPurchaseHistory, getCreditTransactions, purchaseCredits } = useApi()
  
  const [credits, setCredits] = useState<number>(0)
  const [packages, setPackages] = useState<CreditPackage[]>([])
  const [purchases, setPurchases] = useState<CreditPurchase[]>([])
  const [transactions, setTransactions] = useState<CreditTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [showPurchaseModal, setShowPurchaseModal] = useState(false)
  const [showProofUploadModal, setShowProofUploadModal] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [selectedPackage, setSelectedPackage] = useState<CreditPackage | null>(null)
  const [paymentProofFile, setPaymentProofFile] = useState<File | null>(null)
  const [uploadingProof, setUploadingProof] = useState(false)
  const [showHistory, setShowHistory] = useState(false)

  // Helper function to determine active navigation state
  const getActiveClass = (screen: string) => {
    return appState.currentScreen === screen ? 'text-white' : 'text-gray-300 hover:text-white'
  }

  const handleBack = () => {
    navigateTo('home')
  }

  useEffect(() => {
    loadCreditData()
  }, [])

  const loadCreditData = async () => {
    try {
      setLoading(true)
      
      // Load user credits
      const userResponse = await getCurrentUser()
      if (userResponse.success && userResponse.data) {
        setCredits(userResponse.data.credits || 0)
      }

      // Load credit packages
      const packagesResponse = await getCreditPackages()
      if (packagesResponse.success && packagesResponse.data) {
        setPackages(packagesResponse.data)
      }

      // Load purchase history
      const purchasesResponse = await getCreditPurchaseHistory()
      if (purchasesResponse.success && purchasesResponse.data) {
        setPurchases(purchasesResponse.data)
      }

      // Load transactions
      const transactionsResponse = await getCreditTransactions()
      if (transactionsResponse.success && transactionsResponse.data) {
        setTransactions(transactionsResponse.data)
      }

    } catch (error) {
      console.error('Error loading credit data:', error)
      showToast('error', 'Failed to load credit data')
    } finally {
      setLoading(false)
    }
  }

  const handleBuyCredits = (pkg: CreditPackage) => {
    setSelectedPackage(pkg)
    setShowPurchaseModal(true)
  }

  const handleConfirmPurchase = () => {
    // Redirect to ABA payment link
    window.open('https://pay.ababank.com/aZFJ8PdS5wroBfW98', '_blank')
    
    // Close payment modal and show proof upload modal
    setShowPurchaseModal(false)
    setShowProofUploadModal(true)
  }

  const handleProofUpload = async () => {
    if (!selectedPackage || !paymentProofFile) {
      showToast('error', 'Please select a payment proof image')
      return
    }

    setUploadingProof(true)
    try {
      // Convert file to base64 for storage (temporary solution)
      showToast('info', 'Processing image...')
      const base64String = await convertFileToBase64(paymentProofFile)
      const paymentProofUrl = `data:${paymentProofFile.type};base64,${base64String}`
      
      showToast('info', 'Submitting purchase...')
      const response = await purchaseCredits(selectedPackage.id, paymentProofUrl)
      if (response.success) {
        setShowProofUploadModal(false)
        setShowSuccessModal(true)
        setPaymentProofFile(null)
        loadCreditData() // Refresh data
      } else {
        showToast('error', response.message || 'Failed to submit purchase')
      }
    } catch (error) {
      console.error('Error submitting purchase:', error)
      if (error instanceof Error && error.message.includes('base64')) {
        showToast('error', 'Failed to process image. Please try a different image.')
      } else {
        showToast('error', 'Failed to submit purchase. Please try again.')
      }
    } finally {
      setUploadingProof(false)
    }
  }

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => {
        const base64String = (reader.result as string).split(',')[1]
        resolve(base64String)
      }
      reader.onerror = (error) => reject(error)
    })
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        showToast('error', 'Please select an image file')
        return
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        showToast('error', 'Image must be smaller than 5MB')
        return
      }
      
      setPaymentProofFile(file)
    }
  }

  const resetModals = () => {
    setShowPurchaseModal(false)
    setShowProofUploadModal(false)
    setShowSuccessModal(false)
    setSelectedPackage(null)
    setPaymentProofFile(null)
    setUploadingProof(false)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle className="w-4 h-4 text-green-400" />
      case 'rejected': return <XCircle className="w-4 h-4 text-red-400" />
      default: return <Clock className="w-4 h-4 text-yellow-400" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'text-green-400'
      case 'rejected': return 'text-red-400'
      default: return 'text-yellow-400'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen pb-20 flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading credits...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-20" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 pt-8">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
              className="w-10 h-10 bg-white/20 hover:bg-white/30 text-white border border-white/20 rounded-xl"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-white">Your Credits</h1>
              <p className="text-gray-200">Purchase and manage your court credits</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowHistory(!showHistory)}
            className="bg-white/20 hover:bg-white/30 text-white border border-white/20 px-4 py-2 rounded-xl"
          >
            <Clock className="w-4 h-4 mr-2" />
            {showHistory ? 'Packages' : 'History'}
          </Button>
        </div>

        {/* Credits Balance Card */}
        <FadeIn delay={0.1}>
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20 mb-6">
            <div className="text-center">
              <div className="text-6xl font-bold text-white mb-2">{credits}</div>
              <div className="text-gray-300 text-lg mb-4">credits available</div>
              <p className="text-white/70 text-sm">1 credit = $1 USD • Use credits for any booking</p>
            </div>
          </div>
        </FadeIn>

        {!showHistory ? (
          /* Credit Packages */
          <FadeIn delay={0.2}>
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-white mb-4">💎 Credit Packages</h2>
              <p className="text-white/70 mb-6">Choose a package and pay via ABA.</p>
              
              <div className="grid gap-4">
                {packages.map((pkg, index) => (
                  <ScaleButton
                    key={pkg.id}
                    onClick={() => handleBuyCredits(pkg)}
                    className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 hover:bg-white/20 transition-all"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-3">
                          <h3 className="text-lg font-bold text-white">{pkg.description}</h3>
                          {pkg.id === 'popular' && (
                            <div className="bg-yellow-500/20 text-yellow-300 px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                              <Star className="w-3 h-3" />
                              Popular
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-white mb-2">
                          <div className="text-2xl font-bold">${pkg.price}</div>
                          <div className="text-lg text-white/70">→</div>
                          <div className="text-2xl font-bold text-green-300">{pkg.credits} credits</div>
                        </div>
                        {pkg.bonus > 0 && (
                          <div className="text-green-300 text-sm flex items-center">
                            <Gift className="w-4 h-4 mr-1" />
                            +{pkg.bonus} bonus credits!
                          </div>
                        )}
                      </div>
                      <div className="ml-4 flex items-center">
                        <Plus className="w-5 h-5 text-white/70" />
                      </div>
                    </div>
                  </ScaleButton>
                ))}
              </div>
            </div>
          </FadeIn>
        ) : (
          /* Purchase History & Transactions */
          <FadeIn delay={0.2}>
            <div className="space-y-6">
              {/* Purchase History */}
              <div>
                <h2 className="text-2xl font-bold text-white mb-4">📦 Purchase History</h2>
                {purchases.length > 0 ? (
                  <div className="space-y-3">
                    {purchases.map((purchase) => (
                      <div key={purchase.id} className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              {getStatusIcon(purchase.status)}
                              <span className={`font-medium ${getStatusColor(purchase.status)}`}>
                                {purchase.status.charAt(0).toUpperCase() + purchase.status.slice(1)}
                              </span>
                            </div>
                            <div className="text-white font-medium">
                              ${purchase.amount_usd} → {purchase.credits_amount + purchase.bonus_credits} credits
                            </div>
                            <div className="text-white/70 text-sm">
                              {new Date(purchase.createdAt).toLocaleDateString()}
                            </div>
                            {purchase.admin_notes && (
                              <div className="text-white/50 text-xs mt-1">{purchase.admin_notes}</div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-white/70">
                    <CreditCard className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No purchases yet</p>
                  </div>
                )}
              </div>

              {/* Transaction History */}
              <div>
                <h2 className="text-2xl font-bold text-white mb-4">💸 Transaction History</h2>
                {transactions.length > 0 ? (
                  <div className="space-y-3">
                    {transactions.map((transaction) => (
                      <div key={transaction.id} className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="text-white font-medium">{transaction.description}</div>
                            <div className="text-white/70 text-sm">
                              {new Date(transaction.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                          <div className={`font-bold ${transaction.amount > 0 ? 'text-green-300' : 'text-red-300'}`}>
                            {transaction.amount > 0 ? '+' : ''}{transaction.amount}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-white/70">
                    <DollarSign className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No transactions yet</p>
                  </div>
                )}
              </div>
            </div>
          </FadeIn>
        )}
      </div>

      {/* Payment Instructions Modal */}
      {showPurchaseModal && selectedPackage && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 w-full max-w-md">
            <h3 className="text-2xl font-bold text-white mb-4">Purchase {selectedPackage.description}</h3>
            
            <div className="bg-white/5 rounded-xl p-4 mb-6">
              <div className="text-white/70 text-sm mb-2">Package Details:</div>
              <div className="text-white font-medium">
                ${selectedPackage.price} → {selectedPackage.credits} credits
                {selectedPackage.bonus > 0 && ` + ${selectedPackage.bonus} bonus`}
              </div>
            </div>

            <div className="mb-6">
              <div className="text-white font-medium mb-3">Payment Instructions:</div>
              <div className="bg-blue-500/20 rounded-xl p-4 text-white/80 text-sm space-y-2">
                <div>1. Click "Confirm" to redirect to ABA payment</div>
                <div>2. Transfer ${selectedPackage.price} USD via ABA</div>
                <div>3. Take a screenshot of payment confirmation</div>
                <div>4. Return here to upload your proof</div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                variant="ghost"
                onClick={resetModals}
                className="flex-1 bg-white/10 hover:bg-white/20 text-white border border-white/20"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmPurchase}
                className="flex-1 bg-green-500 hover:bg-green-600 text-white font-medium"
              >
                Confirm
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Proof Upload Modal */}
      {showProofUploadModal && selectedPackage && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 w-full max-w-md">
            <h3 className="text-2xl font-bold text-white mb-4">Upload Payment Proof</h3>
            
            <div className="bg-white/5 rounded-xl p-4 mb-6">
              <div className="text-white/70 text-sm mb-2">Package:</div>
              <div className="text-white font-medium">
                {selectedPackage.description} - ${selectedPackage.price}
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-white font-medium mb-3">Upload Payment Screenshot:</label>
              <div className="relative">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="payment-proof-upload"
                />
                <label
                  htmlFor="payment-proof-upload"
                  className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-white/30 rounded-xl bg-white/5 hover:bg-white/10 cursor-pointer transition-all"
                >
                  <Upload className="w-8 h-8 text-white/70 mb-2" />
                  <span className="text-white/70 text-sm text-center">
                    {paymentProofFile ? paymentProofFile.name : 'Tap to select image from gallery'}
                  </span>
                  <span className="text-white/50 text-xs mt-1">Max size: 5MB</span>
                </label>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                variant="ghost"
                onClick={resetModals}
                className="flex-1 bg-white/10 hover:bg-white/20 text-white border border-white/20"
              >
                Cancel
              </Button>
              <Button
                onClick={handleProofUpload}
                disabled={!paymentProofFile || uploadingProof}
                className="flex-1 bg-green-500 hover:bg-green-600 text-white font-medium disabled:opacity-50"
              >
                {uploadingProof ? 'Processing...' : 'Submit Purchase'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && selectedPackage && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 w-full max-w-md">
            <div className="text-center">
              <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-white mb-4">Purchase Submitted!</h3>
              
              <div className="bg-white/5 rounded-xl p-4 mb-6">
                <div className="text-white font-medium mb-2">
                  {selectedPackage.description} - ${selectedPackage.price}
                </div>
                <div className="text-white/70 text-sm">
                  Your purchase request has been submitted for admin review.
                </div>
              </div>

              <div className="bg-blue-500/20 rounded-xl p-4 text-white/80 text-sm mb-6">
                <div className="font-medium mb-2">What happens next:</div>
                <div className="space-y-1 text-left">
                  <div>• Admin will review your payment proof</div>
                  <div>• You'll be notified within 24 hours</div>
                  <div>• Credits will be added to your account once approved</div>
                </div>
              </div>

              <Button
                onClick={resetModals}
                className="w-full bg-green-500 hover:bg-green-600 text-white font-medium"
              >
                Done
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <BottomNavigation
        currentScreen="credits"
        onNavigate={navigateTo}
      />
    </div>
  )
}