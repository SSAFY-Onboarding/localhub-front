<script setup lang="ts">
import { RouterLink } from 'vue-router'
</script>

<template>
  <div class="home-view">
    <section class="hero">
      <div class="container hero-grid">
        <div class="hero-copy">
          <span class="eyebrow">공공데이터로 만나는 우리 동네</span>
          <h1>서울의 오늘을<br /><em>함께 발견해요</em></h1>
          <p>
            관광지부터 문화시설, 축제와 주민들의 생생한 이야기까지.<br />LocalHub에서 서울을 더
            가깝게 만나보세요.
          </p>
          <div class="hero-actions">
            <RouterLink class="button primary" to="/map"
              >지역 지도 보기 <span aria-hidden="true">→</span></RouterLink
            >
            <RouterLink class="button light" to="/posts"
              >커뮤니티 보기 <span aria-hidden="true">→</span></RouterLink
            >
          </div>
        </div>
        <div class="seoul-visual" aria-label="서울 지역 일러스트레이션">
          <div class="sun"></div>
          <div class="mountain mountain-one"></div>
          <div class="mountain mountain-two"></div>
          <div class="tower"><span></span></div>
          <div class="river"></div>
          <div class="visual-badge"><strong>SEOUL</strong><span>37.5665° N, 126.9780° E</span></div>
        </div>
      </div>
    </section>

    <section class="feature-section container">
      <div class="section-heading">
        <span>LOCALHUB FEATURES</span>
        <h2>서울을 즐기는 세 가지 방법</h2>
        <p>흩어진 지역 정보와 사람들의 경험을 한곳에서 만나보세요.</p>
      </div>
      <div class="feature-grid">
        <article class="feature-card">
          <span class="feature-number">01</span>
          <div class="feature-icon map">⌖</div>
          <h3>지역 지도</h3>
          <p>관광지, 문화시설, 축제 등 서울의 다양한 장소를 지도에서 한눈에 살펴보세요.</p>
          <RouterLink class="text-link" to="/map">장소 둘러보기 →</RouterLink>
        </article>
        <article class="feature-card featured">
          <span class="feature-number">02</span>
          <div class="feature-icon community">◌</div>
          <h3>익명 커뮤니티</h3>
          <p>가입 없이 서울의 여행 정보와 동네 이야기를 자유롭게 나누고 발견하세요.</p>
          <RouterLink class="text-link" to="/posts">이야기 둘러보기 →</RouterLink>
        </article>
        <article class="feature-card">
          <span class="feature-number">03</span>
          <div class="feature-icon chat">✦</div>
          <h3>지역 정보 챗봇</h3>
          <p>궁금한 서울 정보를 자연어로 질문하면 공공데이터를 바탕으로 알려드려요.</p>
          <RouterLink class="text-link" to="/chatbot">AI 여행 추천 시작하기 →</RouterLink>
        </article>
      </div>
    </section>

    <section class="community-cta">
      <div class="container cta-inner">
        <div>
          <span class="eyebrow pale">SEOUL COMMUNITY</span>
          <h2>서울에 관한 이야기가 있나요?</h2>
          <p>나만 알고 있던 장소, 오늘 발견한 풍경을 이웃과 나눠보세요.</p>
        </div>
        <RouterLink class="button light" to="/posts/new">첫 이야기 남기기 →</RouterLink>
      </div>
    </section>
  </div>
</template>
