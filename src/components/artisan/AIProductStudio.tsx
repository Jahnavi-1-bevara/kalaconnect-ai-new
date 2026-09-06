import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '../../i18n/LanguageContext';
import { processCraftImage } from '../../services/aiSegmentation';
import { BACKGROUND_PRESETS, getRecommendedBackground } from '../../data/backgroundPresets';
import { AIProcessingResult, AIProcessingStage, BackgroundPreset } from '../../types';
import { BeforeAfterSlider } from '../common/BeforeAfterSlider';
import {
  Sparkles,
  ShieldCheck,
  RefreshCw,
  Layers,
  Image as ImageIcon,
  CheckCircle2,
  AlertTriangle,
  Download,
  ArrowRight,
  Palette,
  FileDown,
} from 'lucide-react';

interface AIProductStudioProps {
  originalImageUrl: string;
  category?: string;
  onStudioComplete: (result: {
    enhancedImageUrl: string;
    cutoutImageUrl: string;
    backgroundStyle: string;
  }) => void;
  onBack?: () => void;
}

export const AIProductStudio: React.FC<AIProductStudioProps> = ({
  originalImageUrl,
  category = 'Indian Handicraft',
  onStudioComplete,
  onBack,
}) => {
  const { t } = useTranslation();

  const [processingStage, setProcessingStage] = useState<AIProcessingStage>('idle');
  const [progressPercent, setProgressPercent] = useState(0);
  const [stageMessage, setStageMessage] = useState('');
  const [selectedBgId, setSelectedBgId] = useState<string>('smart-match');
  const [studioResult, setStudioResult] = useState<AIProcessingResult | null>(null);
  const [activeTab, setActiveTab] = useState<'comparison' | 'cutout' | 'final'>('comparison');
  const [downloadNotice, setDownloadNotice] = useState<string | null>(null);

  // Auto-recommend background based on category
  useEffect(() => {
    const rec = getRecommendedBackground(category);
    setSelectedBgId(rec.id);
  }, [category]);

  const runPipeline = useCallback(
    async (bgId: string) => {
      setProcessingStage('detecting');
      setProgressPercent(10);
      setStageMessage('Analyzing product boundaries and color channels...');

      const result = await processCraftImage(
        originalImageUrl,
        bgId,
        (stage, percent, message) => {
          setProcessingStage(stage);
          setProgressPercent(percent);
          setStageMessage(message);
        }
      );

      setStudioResult(result);
      setProcessingStage('complete');
    },
    [originalImageUrl]
  );

  // Initial trigger
  useEffect(() => {
    if (originalImageUrl) {
      runPipeline(selectedBgId);
    }
  }, [originalImageUrl]);

  const handleSelectBackground = async (bg: BackgroundPreset) => {
    setSelectedBgId(bg.id);
    await runPipeline(bg.id);
  };

  const handleDownloadCutout = () => {
    if (!studioResult?.cutoutUrl) return;
    const link = document.createElement('a');
    link.href = studioResult.cutoutUrl;
    link.download = `kalaconnect-cutout-${Date.now()}.png`;
    link.click();
    setDownloadNotice('Transparent product PNG downloaded!');
    setTimeout(() => setDownloadNotice(null), 3000);
  };

  const handleDownloadFinal = () => {
    if (!studioResult?.finalUrl) return;
    const link = document.createElement('a');
    link.href = studioResult.finalUrl;
    link.download = `kalaconnect-studio-${selectedBgId}-${Date.now()}.jpg`;
    link.click();
    setDownloadNotice('Studio enhanced image downloaded!');
    setTimeout(() => setDownloadNotice(null), 3000);
  };

  const handleKeepOriginal = () => {
    onStudioComplete({
      enhancedImageUrl: originalImageUrl,
      cutoutImageUrl: originalImageUrl,
      backgroundStyle: 'original',
    });
  };

  const handleContinue = () => {
    if (studioResult?.success) {
      onStudioComplete({
        enhancedImageUrl: studioResult.finalUrl,
        cutoutImageUrl: studioResult.cutoutUrl,
        backgroundStyle: selectedBgId,
      });
    } else {
      handleKeepOriginal();
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-craft-sand shadow-craft-md p-6 sm:p-8 space-y-8">
      {/* Studio Header & Product Preservation Badge */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-craft-sand pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-craft-terracotta/10 text-craft-terracotta">
              <Sparkles className="w-5 h-5" />
            </span>
            <h2 className="text-2xl font-serif font-bold text-craft-charcoal">
              {t('studio.title', 'AI Product Studio')}
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-craft-muted">
            {t(
              'studio.subtitle',
              'Real product background removal & studio compositing with complete product preservation.'
            )}
          </p>
        </div>

        {/* Product Preservation Guarantee Badge */}
        <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-craft-forest/10 border border-craft-forest/20 text-craft-forest text-xs font-semibold self-start md:self-auto shadow-craft-sm">
          <ShieldCheck className="w-4 h-4 text-craft-forest shrink-0" />
          <span>Product Preservation Rule: 100% Original Pixels Intact</span>
        </div>
      </div>

      {/* Progress & Processing Indicator */}
      {processingStage !== 'complete' && processingStage !== 'refinement_needed' && (
        <div className="p-8 rounded-2xl bg-craft-stone/50 border border-craft-sand space-y-4 text-center">
          <div className="flex items-center justify-center">
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 rounded-full border-4 border-craft-sand"></div>
              <div
                className="absolute inset-0 rounded-full border-4 border-craft-terracotta border-t-transparent animate-spin"
                style={{ animationDuration: '1.2s' }}
              ></div>
              <div className="absolute inset-0 flex items-center justify-center font-bold text-xs text-craft-charcoal">
                {progressPercent}%
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-sm font-serif font-bold text-craft-charcoal">
              {stageMessage || 'Processing Product Photography...'}
            </div>
            <p className="text-xs text-craft-muted">
              Executing true background removal, preserving components (cables, handles, edges) & simulating studio lighting.
            </p>
          </div>

          {/* Pipeline Stage Badges */}
          <div className="flex flex-wrap justify-center gap-2 pt-2 text-[11px] text-craft-muted">
            <span className={progressPercent >= 25 ? 'text-craft-forest font-semibold' : ''}>
              1. Detection ✓
            </span>
            <span>•</span>
            <span className={progressPercent >= 50 ? 'text-craft-forest font-semibold' : ''}>
              2. Segmentation ✓
            </span>
            <span>•</span>
            <span className={progressPercent >= 75 ? 'text-craft-forest font-semibold' : ''}>
              3. Component Protection ✓
            </span>
            <span>•</span>
            <span className={progressPercent >= 90 ? 'text-craft-forest font-semibold' : ''}>
              4. Validation ✓
            </span>
          </div>
        </div>
      )}



      {/* Studio Completed Viewer */}
      {processingStage === 'complete' && studioResult && (
        <div className="space-y-6">
          {/* View Mode Tabs & Download Actions */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-craft-sand/70 pb-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab('comparison')}
                className={`px-3.5 py-2 rounded-xl text-xs font-medium transition-colors flex items-center gap-1.5 ${
                  activeTab === 'comparison'
                    ? 'bg-craft-terracotta text-white shadow-craft-sm'
                    : 'bg-craft-stone/60 text-craft-charcoal hover:bg-craft-stone'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Before / After Slider</span>
              </button>

              <button
                onClick={() => setActiveTab('cutout')}
                className={`px-3.5 py-2 rounded-xl text-xs font-medium transition-colors flex items-center gap-1.5 ${
                  activeTab === 'cutout'
                    ? 'bg-craft-terracotta text-white shadow-craft-sm'
                    : 'bg-craft-stone/60 text-craft-charcoal hover:bg-craft-stone'
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>Transparent Cutout (PNG)</span>
              </button>

              <button
                onClick={() => setActiveTab('final')}
                className={`px-3.5 py-2 rounded-xl text-xs font-medium transition-colors flex items-center gap-1.5 ${
                  activeTab === 'final'
                    ? 'bg-craft-terracotta text-white shadow-craft-sm'
                    : 'bg-craft-stone/60 text-craft-charcoal hover:bg-craft-stone'
                }`}
              >
                <Palette className="w-3.5 h-3.5" />
                <span>Studio Composite</span>
              </button>
            </div>

            {/* Download & Retry Buttons */}
            <div className="flex items-center gap-2">
              {/* Independent Transparent PNG Download (Rule 14) */}
              <button
                onClick={handleDownloadCutout}
                className="px-3 py-1.5 rounded-xl border border-craft-sand bg-white text-craft-charcoal hover:border-craft-terracotta text-xs font-medium flex items-center gap-1.5 shadow-craft-sm"
                title="Download transparent PNG cutout"
              >
                <FileDown className="w-3.5 h-3.5 text-craft-terracotta" />
                <span>Download Transparent PNG</span>
              </button>

              <button
                onClick={handleDownloadFinal}
                className="px-3 py-1.5 rounded-xl border border-craft-sand bg-white text-craft-charcoal hover:border-craft-terracotta text-xs font-medium flex items-center gap-1.5 shadow-craft-sm"
                title="Download enhanced image"
              >
                <Download className="w-3.5 h-3.5 text-craft-forest" />
                <span>Save Studio Image</span>
              </button>

              <button
                onClick={() => runPipeline(selectedBgId)}
                className="p-2 rounded-xl border border-craft-sand text-craft-charcoal hover:bg-craft-stone text-xs flex items-center gap-1.5"
                title="Retry processing"
              >
                <RefreshCw className="w-3.5 h-3.5 text-craft-muted" />
              </button>
            </div>
          </div>

          {downloadNotice && (
            <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{downloadNotice}</span>
            </div>
          )}

          {/* Main Display Canvas / Slider */}
          <div className="relative min-h-[380px] sm:min-h-[460px] flex items-center justify-center rounded-2xl overflow-hidden bg-craft-stone/30 border border-craft-sand">
            {activeTab === 'comparison' && (
              <BeforeAfterSlider
                beforeImage={originalImageUrl}
                afterImage={studioResult.finalUrl}
                beforeLabel={t('studio.slider_before', 'Original Photo')}
                afterLabel={t('studio.slider_after', 'KalaConnect AI Studio')}
                className="w-full h-[400px] sm:h-[480px]"
              />
            )}

            {activeTab === 'cutout' && (
              <div className="w-full h-[400px] sm:h-[480px] flex items-center justify-center bg-transparency-grid p-6 relative">
                <img
                  src={studioResult.cutoutUrl}
                  alt="Transparent Product Cutout"
                  className="max-h-full max-w-full object-contain filter drop-shadow-md"
                />
                <div className="absolute bottom-4 left-4 bg-craft-charcoal/80 text-white text-[11px] px-3 py-1 rounded-full backdrop-blur-sm">
                  Transparent Cutout (100% Original Pixels Preserved, Background Removed)
                </div>
              </div>
            )}

            {activeTab === 'final' && (
              <div className="w-full h-[400px] sm:h-[480px] flex items-center justify-center bg-craft-charcoal/5 p-4 relative">
                <img
                  src={studioResult.finalUrl}
                  alt="Final Studio Composite"
                  className="max-h-full max-w-full object-contain rounded-xl shadow-craft-md"
                />
                <div className="absolute bottom-4 left-4 bg-craft-charcoal/80 text-white text-[11px] px-3 py-1 rounded-full backdrop-blur-sm">
                  Active Setting: {BACKGROUND_PRESETS.find((b) => b.id === selectedBgId)?.name}
                </div>
              </div>
            )}
          </div>

          {/* Background Presets Selector (All Studio Settings) */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-craft-charcoal uppercase tracking-wider flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-craft-terracotta" />
                <span>Select Studio Setting (Background Replacement):</span>
              </label>
              <span className="text-[11px] text-craft-muted">
                Category Match: <strong className="text-craft-charcoal">{category}</strong>
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
              {BACKGROUND_PRESETS.map((bg) => {
                const isSelected = selectedBgId === bg.id;
                return (
                  <button
                    key={bg.id}
                    type="button"
                    onClick={() => handleSelectBackground(bg)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'border-craft-terracotta bg-craft-terracotta/5 shadow-craft-sm ring-1 ring-craft-terracotta'
                        : 'border-craft-sand bg-craft-stone/20 hover:bg-craft-stone/60'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-craft-charcoal truncate">
                        {bg.name}
                      </span>
                      {isSelected && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-craft-terracotta shrink-0" />
                      )}
                    </div>
                    <p className="text-[10px] text-craft-muted line-clamp-2 mt-1 leading-snug">
                      {bg.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Studio Navigation Buttons */}
          <div className="pt-4 border-t border-craft-sand flex items-center justify-between">
            {onBack ? (
              <button
                type="button"
                onClick={onBack}
                className="px-5 py-2.5 rounded-xl border border-craft-sand text-craft-charcoal hover:bg-craft-stone text-xs font-medium"
              >
                {t('btn.back', 'Back to Upload')}
              </button>
            ) : (
              <div></div>
            )}

            <button
              type="button"
              onClick={handleContinue}
              className="px-6 py-3 rounded-xl bg-craft-terracotta hover:bg-craft-terracotta-dark text-white text-xs font-semibold shadow-craft-md flex items-center gap-2 transition-colors"
            >
              <span>{t('btn.continue', 'Continue to Catalog Creation')}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
