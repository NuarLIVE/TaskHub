import { useState, useRef, useEffect } from 'react';
import { X, RotateCw, Crop, ZoomIn, ZoomOut, Check } from 'lucide-react';
import { Button } from './ui/button';

interface MediaEditorProps {
  file: File;
  onSave: (editedFile: File) => void;
  onCancel: () => void;
}

export function MediaEditor({ file, onSave, onCancel }: MediaEditorProps) {
  const [rotation, setRotation] = useState(0);
  const [scale, setScale] = useState(1);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [cropMode, setCropMode] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [imageUrl, setImageUrl] = useState<string>('');
  const isVideo = file.type.startsWith('video/');

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setImageUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    if (!isVideo && imageUrl && canvasRef.current && imgRef.current) {
      drawCanvas();
    }
  }, [rotation, scale, brightness, contrast, saturation, imageUrl, isVideo]);

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;

    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(scale, scale);
    ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;
    ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
    ctx.restore();
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleZoomIn = () => {
    setScale((prev) => Math.min(prev + 0.1, 3));
  };

  const handleZoomOut = () => {
    setScale((prev) => Math.max(prev - 0.1, 0.5));
  };

  const handleSave = async () => {
    if (isVideo) {
      onSave(file);
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.toBlob((blob) => {
      if (!blob) return;
      const editedFile = new File([blob], file.name, {
        type: file.type,
        lastModified: Date.now(),
      });
      onSave(editedFile);
    }, file.type);
  };

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex flex-col">
      <div className="flex items-center justify-between p-4 bg-black/50">
        <h3 className="text-white text-lg font-semibold">
          {isVideo ? 'Предпросмотр видео' : 'Редактировать изображение'}
        </h3>
        <Button variant="ghost" size="sm" onClick={onCancel} className="text-white hover:bg-white/10">
          <X className="h-5 w-5" />
        </Button>
      </div>

      <div className="flex-1 flex items-center justify-center p-4 overflow-hidden">
        {isVideo ? (
          <video src={imageUrl} controls className="max-w-full max-h-full" />
        ) : (
          <>
            <img
              ref={imgRef}
              src={imageUrl}
              alt="Preview"
              className="hidden"
              onLoad={drawCanvas}
            />
            <canvas
              ref={canvasRef}
              className="max-w-full max-h-full object-contain"
              style={{
                transform: `rotate(${rotation}deg) scale(${scale})`,
                filter: `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`,
              }}
            />
          </>
        )}
      </div>

      {!isVideo && (
        <div className="bg-black/50 p-4 space-y-4">
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRotate}
              className="text-white hover:bg-white/10"
            >
              <RotateCw className="h-4 w-4 mr-2" />
              Повернуть
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleZoomIn}
              className="text-white hover:bg-white/10"
            >
              <ZoomIn className="h-4 w-4 mr-2" />
              Увеличить
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleZoomOut}
              className="text-white hover:bg-white/10"
            >
              <ZoomOut className="h-4 w-4 mr-2" />
              Уменьшить
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCropMode(!cropMode)}
              className="text-white hover:bg-white/10"
            >
              <Crop className="h-4 w-4 mr-2" />
              {cropMode ? 'Отмена обрезки' : 'Обрезать'}
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto">
            <div>
              <label className="text-white text-sm block mb-2">
                Яркость: {brightness}%
              </label>
              <input
                type="range"
                min="0"
                max="200"
                value={brightness}
                onChange={(e) => setBrightness(Number(e.target.value))}
                className="w-full"
              />
            </div>
            <div>
              <label className="text-white text-sm block mb-2">
                Контраст: {contrast}%
              </label>
              <input
                type="range"
                min="0"
                max="200"
                value={contrast}
                onChange={(e) => setContrast(Number(e.target.value))}
                className="w-full"
              />
            </div>
            <div>
              <label className="text-white text-sm block mb-2">
                Насыщенность: {saturation}%
              </label>
              <input
                type="range"
                min="0"
                max="200"
                value={saturation}
                onChange={(e) => setSaturation(Number(e.target.value))}
                className="w-full"
              />
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-center gap-4 p-4 bg-black/50">
        <Button variant="outline" onClick={onCancel} className="min-w-[120px]">
          Отмена
        </Button>
        <Button onClick={handleSave} className="min-w-[120px] bg-[#3F7F6E] hover:bg-[#2d5f52]">
          <Check className="h-4 w-4 mr-2" />
          Отправить
        </Button>
      </div>
    </div>
  );
}
