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
