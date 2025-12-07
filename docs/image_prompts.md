# 网站图片生成提示词 (Image Prompts)

> **💡 关于文件大小与画质的重要说明：**
> *   **请保留提示词中的 "4K quality"**：这告诉 AI 去生成高细节的纹理和光影（风格层面），它**不会**强制生成很大的文件。
> *   **在设置中控制尺寸**：在使用 Nano Banana Pro 时，请将 **Aspect Ratio (宽高比)** 设置为各版块推荐的比例（例如 1:1 或 16:9）。除非必要，不要勾选 "Upscale to 4K"（放大到 4K）。
> *   **结果**：你将得到一张清晰、专业的图片，大小约为 1-3MB，而不是 17MB。

请使用以下提示词在 **Nano Banana Pro** 或您喜欢的 AI 图片生成器中创建新主页所需的视觉资产。

## 1. 分屏主页图片 (Split-Screen Hero Images)
> **推荐设置：** 宽高比 **1:1** 或 **3:4** (例如 1024x1024)。
> *原因：因为屏幕被左右平分，这些图片会以竖长或正方形显示。如果使用宽的 16:9 图片，会被裁剪掉太多内容。*

### 左侧：医疗信任 (安全感)
**文件名：** `assets/images/hero_medical_placeholder.png`
**提示词 (Prompt)：**
```text
Professional photography, interior shot of a high-end private medical clinic in Beijing, warm ambient lighting, 85mm lens, depth of field. A friendly female doctor in a crisp white coat is smiling warmly at a patient (back to camera) in a modern consultation room. Teal and white color palette, clean, sterile but welcoming, not cold. Cinematic lighting, 4k quality.
```

### 右侧：文化探险 (趣味感)
**文件名：** `assets/images/hero_culture_placeholder.png`
**提示词 (Prompt)：**
```text
Breathtaking landscape photography of the Great Wall of China at golden hour. Warm sunlight hitting the ancient stones, lush green mountains in the background. Sense of freedom and history. A couple (small in frame) walking in the distance enjoying the view. Vibrant colors, epic scale, wide angle shot.
```

## 2. 患者故事 (社会证明)
> **推荐设置：** 宽高比 **1:1** (正方形，例如 512x512 或 1024x1024)。
> *原因：这些图片会显示为圆形头像。*

请生成 3 张独特的"肖像"用于推荐板块。

**文件名：** `assets/images/patient_sarah_placeholder.png`
**提示词 1 (Sarah, 45岁, 美国)：**
```text
Portrait of a happy middle-aged American woman, 45 years old, natural smile, standing in a garden. Soft sunlight, casual elegant clothing. High quality DSLR photo.
```

**文件名：** `assets/images/patient_michael_placeholder.png`
**提示词 2 (Michael, 55岁, 英国)：**
```text
Portrait of a distinguished British man, 55 years old, wearing a suit jacket but no tie, relaxed pose in a modern office lobby. confident smile. Professional lighting.
```

**文件名：** `assets/images/patient_elena_placeholder.png`
**提示词 3 (Elena, 38, 澳大利亚)：**
```text
Portrait of an Australian woman, 38 years old, travel influencer style, wearing a sun hat and scarf, standing in front of a blurred traditional Chinese building. Bright, energetic, happy.
```

## 3. 背景纹理 (可选)
> **推荐设置：** 宽高比 **16:9** (例如 1920x1080)。
> *原因：这会覆盖屏幕的全宽。*

**文件名：** `assets/images/bg_texture.png`
**提示词 (Prompt)：**
```text
Abstract background texture, subtle traditional Chinese cloud pattern (Xiangyun) blended with modern geometric medical cross shapes. Very faint, white and light grey, minimalist, seamless pattern.
```
