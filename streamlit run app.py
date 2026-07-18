import streamlit as str
import time

# إعدادات الصفحة الأساسية
str.set_page_config(
    page_title="منصة خدمات الذكاء الاصطناعي الذكية",
    page_icon="🤖",
    layout="centered"
)

# تصميم واجهة التطبيق بالـ CSS لتحسين المظهر والعناوين المقلوبة
str.markdown("""
    <style>
    .main-title {
        font-size: 36px;
        color: #1E88E5;
        text-align: center;
        font-weight: bold;
        margin-bottom: 20px;
    }
    .section-title {
        font-size: 24px;
        color: #00ACC1;
        font-weight: bold;
        margin-bottom: 10px;
    }
    </style>
""", unsafe_allow_html=True)

# القائمة الجانبية للتنقل بين الخدمات
str.sidebar.title("🤖 لوحة التحكم")
str.sidebar.subheader("مساعد البرمجة الذكي")
str.sidebar.write("خطوة بخطوة ستصبح مطوراً محترفاً! 🚀")
str.sidebar.markdown("---")

# اختيار الخدمة
service = str.sidebar.radio(
    "اختر الخدمة التي تريدها:",
    ("توليد الصور الذكية", "كتابة النصوص والمقالات")
)

# --- الخدمة الأولى: توليد الصور الذكية ---
if service == "توليد الصور الذكية":
    str.markdown('<p class="main-title">🖼️ نظام توليد الصور الذكي</p>', unsafe_allow_html=True)
    str.write("الوصف الذي تريده الآن ليتحول إلى لوحة فنية >>")
    
    # خانة إدخال الوصف
    image_prompt = str.text_input("اكتب وصف الصورة هنا:", placeholder="مثال: رائد فضاء يركب حصاناً على سطح المريخ...")
    
    # زر توليد الصورة
    if str.button("✨ توليد الصورة"):
        if image_prompt.strip() != "":
            with str.spinner("🔄 جاري الاتصال بالسيرفر لتوليد صورتك المبتكرة..."):
                time.sleep(3) # محاكاة وقت التحميل
            str.success("✅ تم توليد الصورة بنجاح! (هنا سيتم عرض الصورة الناتجة من الـ API)")
            # هنا مستقبلاً يتم ربط الـ API وعرض الصورة
            str.image("https://via.placeholder.com/600x400.png?text=Your+AI+Image+Here", caption="الصورة التخيلية المقترحة")
        else:
            str.warning("⚠️ من فضلك اكتب وصفاً للصورة أولاً!")

# --- الخدمة الثانية: كتابة النصوص والمقالات ---
elif service == "كتابة النصوص والمقالات":
    str.markdown('<p class="main-title">📝 نظام توليد النصوص والذكاء الاصطناعي</p>', unsafe_allow_html=True)
    str.write("أهلاً بك في نظام توليد النصوص الذكي >>")
    
    # خانة إدخال موضوع المقال
    text_prompt = str.text_input("ما هو موضوع المقال الذي تريده؟", placeholder="مثال: أهمية تعلم البرمجة في العصر الحديث...")
    
    # زر توليد المقال
    if str.button("✍️ اكتب المقال"):
        if text_prompt.strip() != "":
            with str.spinner("⏳ جاري صياغة المقال بأحدث تقنيات الذكاء الاصطناعي..."):
                time.sleep(4) # محاكاة وقت التفكير والصياغة
            
            str.success("✅ تم كتابة المقال بنجاح:")
            str.markdown('<p class="section-title">المقال الناتجة:</p>', unsafe_allow_html=True)
            
            # نص افتراضي يظهر للمستخدم كمثال
            result_text = f"""
            ### مقال حول: {text_prompt}
            
            يعتبر هذا الموضوع من المواضيع الحيوية في عصرنا الحالي، حيث يساهم الذكاء الاصطناعي والتطور التكنولوجي في إعادة تشكيل الطريقة التي نعيش ونعمل بها. 
            
            إن الاستثمار في فهم هذه التقنيات يفتح آفاقاً جديدة للمستقبل ويساعد المطورين والمبدعين على تحقيق أهدافهم بكفاءة أعلى وسرعة غير مسبوقة.
            """
            str.info(result_text)
        else:
            str.warning("⚠️ من فضلك اكتب عنواناً أو موضوعاً للمقال أولاً!")

# تذييل الصفحة
str.markdown("---")
str.caption("تم التطوير بكل حب | منصة الذكاء الاصطناعي المتكاملة 🚀")