import streamlit as st
import time

# إعدادات الصفحة الأساسية للمنصة
st.set_page_config(
    page_title="منصة خدمات الذكاء الاصطناعي المتكاملة",
    page_icon="🧠",
    layout="wide"
)

# تصميم واجهة التطبيق الاحترافية بألوان جذابة (CSS)
st.markdown("""
    <style>
    .main-title {
        font-size: 42px;
        color: #1E3A8A;
        text-align: center;
        font-weight: bold;
        margin-bottom: 10px;
    }
    .sub-title {
        font-size: 18px;
        color: #4B5563;
        text-align: center;
        margin-bottom: 30px;
    }
    .service-box {
        background-color: #F3F4F6;
        padding: 25px;
        border-radius: 12px;
        border-left: 6px solid #3B82F6;
        margin-bottom: 20px;
    }
    .chat-bubble-user {
        background-color: #DBEAFE;
        padding: 12px 18px;
        border-radius: 15px 15px 0px 15px;
        margin-bottom: 10px;
        text-align: right;
        max-width: 70%;
        margin-left: auto;
    }
    .chat-bubble-ai {
        background-color: #F3F4F6;
        padding: 12px 18px;
        border-radius: 15px 15px 15px 0px;
        margin-bottom: 10px;
        text-align: left;
        max-width: 70%;
        margin-right: auto;
    }
    </style>
""", unsafe_allow_html=True)

# العنوان الرئيسي للمنصة
st.markdown('<div class="main-title">🧠 منصة الـ AI المتكاملة والمطورة</div>', unsafe_allow_html=True)
st.markdown('<div class="sub-title">النسخة الاحترافية: دردشة ذكية، توليد صور، وكتابة محتوى</div>', unsafe_allow_html=True)

# القائمة الجانبية للتنقل بين الخدمات (Sidebar)
st.sidebar.title("🎛️ لوحة التحكم")
st.sidebar.markdown("---")
service = st.sidebar.radio(
    "اختر الخدمة التي تريدها:",
    [
        "💬 الدردشة مع الذكاء الاصطناعي", 
        "🎨 توليد الصور بالذكاء الاصطناعي", 
        "📝 صانع المحتوى والمقالات", 
        "💻 مساعد البرمجة الذكي"
    ]
)

st.sidebar.markdown("---")
st.sidebar.success("👑 المطور: الباشمهندس محمد عادل")
st.sidebar.info("🚀 التحديث الحالي يتضمن نظام دردشة تفاعلي ذكي.")

# ==========================================
# 1. خدمة الدردشة الذكية (الميزة الجديدة والأساسية)
# ==========================================
if service == "💬 الدردشة مع الذكاء الاصطناعي":
    st.header("💬 غرف الدردشة الذكية (AI Chatbot)")
    st.write("أهلاً بك! يمكنك سؤالي عن أي شيء، وسأقوم بالرد عليك فوراً وبذكاء:")

    # إنشاء ذاكرة لحفظ المحادثة داخل المتصفح عشان ما تضيعش عند كل ضغطة زرار
    if "messages" not in st.session_state:
        st.session_state.messages = [
            {"role": "assistant", "content": "مرحباً بك يا بطل! أنا مساعدك الذكي المطور في هذه المنصة. كيف يمكنني مساعدتك اليوم في البرمجة أو في أي مجال آخر؟"}
        ]

    # عرض الرسائل السابقة بشكل أنيق
    for message in st.session_state.messages:
        if message["role"] == "user":
            st.markdown(f'<div class="chat-bubble-user">{message["content"]}</div>', unsafe_allow_html=True)
        else:
            st.markdown(f'<div class="chat-bubble-ai">{message["content"]}</div>', unsafe_allow_html=True)

    # مربع إدخال رسالة المستخدم الجديدة
    if user_input := st.chat_input("اكتب رسالتك هنا وسيرد عليك الذكاء الاصطناعي..."):
        # عرض رسالة المستخدم فوراً
        st.markdown(f'<div class="chat-bubble-user">{user_input}</div>', unsafe_allow_html=True)
        st.session_state.messages.append({"role": "user", "content": user_input})
        
        # توليد رد الذكاء الاصطناعي الذكي بناءً على الكلمات المفتاحية
        with st.spinner("جاري التفكير وصياغة الرد..."):
            time.sleep(1) # محاكاة وقت التفكير
            
            # منطق الردود الذكية (يمكنك تطويره مستقبلاً لربطه بـ API حقيقي)
            low_input = user_input.lower()
            if "بايثون" in low_input or "python" in low_input or "برمجة" in low_input:
                ai_response = "لغة بايثون هي لغة ممتعة وقوية جداً! يمكنك استخدامها لتطوير تطبيقات الويب، الذكاء الاصطناعي، أو الألعاب. استمر في تعلمها وأنا هنا لمساعدتك في أي كود تحتاجه!"
            elif "السلام" in low_input or "مرحبا" in low_input or "أهلاً" in low_input:
                ai_response = "وعليكم السلام ورحمة الله وبركاته! أهلاً بك يا هندسة، كيف يمكنني دعم مشروعك اليوم؟"
            elif "اسمك" in low_input:
                ai_response = "أنا المساعد الذكي الخاص بمنصة محمد عادل للذكاء الاصطناعي!"
            else:
                ai_response = f"أنا هنا معك! لقد استقبلت رسالتك: '{user_input}'. هذا السؤال ذكي جداً، وفي النسخة القادمة سنربطه بقاعدة بيانات ضخمة ليعطيك تفاصيل أدق وأعمق!"
            
            # عرض رد الذكاء الاصطناعي وحفظه في الذاكرة
            st.markdown(f'<div class="chat-bubble-ai">{ai_response}</div>', unsafe_allow_html=True)
            st.session_state.messages.append({"role": "assistant", "content": ai_response})

# ==========================================
# 2. خدمة توليد الصور (المطورة)
# ==========================================
elif service == "🎨 توليد الصور بالذكاء الاصطناعي":
    st.header("🎨 نظام توليد الصور الفنية")
    st.write("حول أفكارك وجملك إلى لوحات فنية مرئية:")
    
    prompt = st.text_input("أدخل وصف الصورة بالتفصيل:", placeholder="مثال: مدينة مستقبلية مليئة بالسيارات الطائرة والأنوار الخافتة...")
    
    if st.button("✨ توليد اللوحة"):
        if prompt:
            st.info(f"🔄 جاري معالجة الألوان والخطوط لتوليد: '{prompt}'...")
            st.success("🎉 تم توليد الصورة بنجاح!")
            st.image("https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe", caption=prompt, use_column_width=True)
        else:
            st.warning("⚠️ يرجى كتابة وصف للصورة أولاً.")

# ==========================================
# 3. صانع المحتوى والمقالات
# ==========================================
elif service == "📝 صانع المحتوى والمقالات":
    st.header("📝 صانع المحتوى والمقالات التلقائي")
    st.write("أدخل عنوان الموضوع ودع النظام يصيغ لك مقالاً احترافياً:")
    
    topic = st.text_input("عنوان المقال الرئيسي:")
    tone = st.selectbox("أسلوب الكتابة المحبب:", ["رسمي وإخباري", "إبداعي ومشوق", "تسويقي وجذاب"])
    
    if st.button("✍️ إنشاء المقال الآن"):
        if topic:
            st.info(f"⏳ جاري توليد أفكار المقال بأسلوب {tone}...")
            st.markdown(f"""
            <div class="service-box">
            <h3>📄 عنوان المقال: {topic}</h3>
            <p>تم صياغة هذا المحتوى الاحترافي خصيصاً لمنصتك وملاءمته لأسلوبك المفضل ({tone}).</p>
            <p>يعد الذكاء الاصطناعي ركيزة أساسية الآن في عالم كتابة المحتوى، حيث يساعد المطورين وصنّاع المحتوى على إنتاج مقالات خالية من الأخطاء اللغوية وبصياغة ممتازة في ثوانٍ معدودة.</p>
            </div>
            """, unsafe_allow_html=True)
        else:
            st.warning("⚠️ يرجى كتابة اسم الموضوع.")

# ==========================================
# 4. مساعد البرمجة والتعليم الذكي
# ==========================================
elif service == "💻 مساعد البرمجة الذكي":
    st.header("💻 خبير البرمجة وتصحيح الأكواد")
    st.write("ضع أكواد بايثون هنا لتحليلها أو العثور على الأخطاء:")
    
    code_input = st.text_area("انسخ الكود البرمجي هنا:", height=150, placeholder="print('Hello Mohamed')")
    task = st.selectbox("اختر نوع المساعدة البرمجية:", ["شرح الكود خطوة بخطوة", "البحث عن الأخطاء البرمجية وتعديلها", "تحسين الأداء وفلسفة الكود"])
    
    if st.button("🤖 فحص الكود"):
        if code_input:
            st.info("⚡ جاري تشغيل المترجم البرمجي للذكاء الاصطناعي...")
            st.markdown(f"""
            <div class="service-box">
            <h3>🛠️ تقرير الفحص البرمجي الكامل:</h3>
            <p><b>نوع الفحص:</b> {task}</p>
            <p><b>النتيجة:</b> الكود الخاص بك يخلو من المشاكل الهيكلية أو البرمجية ومتوافق تماماً مع معايير لغة بايثون الحديثة. جاهز للتثبيت والتشغيل في VS Code!</p>
            </div>
            """, unsafe_allow_html=True)
        else:
            st.warning("⚠️ يرجى لصق الكود البرمجي أولاً.")
