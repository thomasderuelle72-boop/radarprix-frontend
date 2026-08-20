import { useState, useEffect, lazy, Suspense } from "react";
import { T, CATEGORIES, FEATURED_MERCHANTS } from "./theme.js";
import DealCard, { SkeletonCard } from "./components/DealCard.jsx";
import MobileNav from "./components/MobileNav.jsx";
// Chargé à la demande : cette vue tire recharts (le moteur de graphiques de
// l'historique de prix), de loin la plus grosse dépendance du projet. En
// import statique, tout visiteur la téléchargeait au premier chargement de la
// page d'accueil, même sans jamais ouvrir une fiche produit.
const ProductDetailView = lazy(() => import("./components/ProductDetailView.jsx"));
import Avatar from "./components/Avatar.jsx";
import AuthorLink from "./components/AuthorLink.jsx";
import Reveal from "./components/Reveal.jsx";
import Hero3D from "./components/Hero3D.jsx";
import Tilt3D from "./components/Tilt3D.jsx";
import Icon from "./components/Icon.jsx";
import PageShell, { EmptyState } from "./components/PageShell.jsx";
import CommunityTabs from "./components/CommunityTabs.jsx";
import CommunityDealCard from "./components/CommunityDealCard.jsx";
const MerchantView = lazy(() => import("./components/MerchantView.jsx"));
const ProfileView = lazy(() => import("./components/ProfileView.jsx"));
const ChatView = lazy(() => import("./components/ChatView.jsx"));
import { relativeTime } from "./utils.js";
import AvatarPicker from "./components/AvatarPicker.jsx";
import OnboardingModal from "./components/OnboardingModal.jsx";

/* ════════════════════════════════════════════════════════════════
   RADARPRIX v4 — branché sur le vrai backend (Railway + SerpApi).
   Plus aucun appel à l'API Claude : les scans interrogent Google
   Shopping via ton propre serveur, et l'algorithme de détection
   tourne côté serveur (src/algorithm.js), en pur code.
   ════════════════════════════════════════════════════════════════ */

import {
  fetchDeals,
  scanBackend,
  apiGetLatest,
  apiAuth,
  apiWatchlistAdd,
  apiWatchlistGet,
  apiUpdateProfile,
  apiChangePassword,
  apiDeleteAccount,
  apiAdminStats,
  apiAdminUsers,
  apiAdminTriggerScan,
  apiCommunityListDeals,
  apiCommunitySubmitDeal,
  apiCommunityVote,
  apiCommunityRemoveVote,
  apiForumCategories,
  apiForumThreads,
  apiForumCreateThread,
  apiForumThread,
  apiForumReply,
  setUnauthorizedHandler,
  apiFollowingFeed,
  apiFollowMember,
} from "./api.js";
import { stateToPath, pathToState, legacyProductParam, setProfileNavigator, ouvrirProfil } from "./routes.js";

// Toutes les vues liées au menu "Communauté", utilisées pour surligner l'onglet dans la nav.
const COMMUNITY_VIEWS = ["communaute-picks", "communaute-chat", "communaute-forum", "communaute-forum-thread"];

/* ── Styles globaux ─────────────────────────────────────────── */
const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Unbounded:wght@500;700;900&family=Inter:wght@400;600;800&display=swap');
    * { box-sizing: border-box; margin: 0; }
    body { background: ${T.bg}; }
    img, svg { max-width: 100%; }
    .rp-display { font-family: 'Unbounded', system-ui, sans-serif; }
    .rp-body { font-family: 'Inter', system-ui, sans-serif; }
    @keyframes priceGlitch {
      0%, 38% { transform: translateY(0); }
      45%, 88% { transform: translateY(-100%); }
      95%, 100% { transform: translateY(0); }
    }
    @keyframes sweep { from { transform: rotate(0); } to { transform: rotate(360deg); } }
    @keyframes fadeUp { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
    .fade-up { animation: fadeUp 280ms cubic-bezier(.2,.8,.2,1) both; }
    /* CTA principal : léger décollé + montée de luminosité au survol */
    .rp-cta { transition: transform 160ms cubic-bezier(.2,.8,.2,1), filter 160ms cubic-bezier(.2,.8,.2,1); }
    .rp-cta:hover { transform: translateY(-1px) scale(1.01); filter: brightness(1.04); }
    /* Petit point vert pulsant pour signaler une donnée vérifiée récemment */
    .rp-fresh-dot { width: 6px; height: 6px; border-radius: 50%; background: ${T.green}; box-shadow: 0 0 8px rgba(53,212,117,.5); position: relative; display: inline-block; flex-shrink: 0; }
    .rp-fresh-dot::after { content: ''; position: absolute; inset: -4px; border-radius: 999px; background: rgba(53,212,117,.2); animation: rpPulse 1.8s infinite; }
    @keyframes rpPulse { 0% { transform: scale(.8); opacity: .8; } 70%, 100% { transform: scale(1.8); opacity: 0; } }
    /* Ouverture des modales : fondu + léger zoom */
    .rp-modal-in { animation: rpModalIn 320ms cubic-bezier(.2,.8,.2,1) both; }
    @keyframes rpModalIn { from { opacity: 0; transform: scale(.98); } to { opacity: 1; transform: scale(1); } }
    /* Balayage radar discret, uniquement décoratif derrière le hero */
    @keyframes rpSweep { to { transform: rotate(360deg); } }
    .rp-radar-sweep { animation: rpSweep 2700ms linear infinite; }
    /* Badge "tamponné" : léger effet de rebond façon tampon de caisse */
    @keyframes stampIn {
      0% { transform: scale(1.6) rotate(-14deg); opacity: 0; }
      60% { transform: scale(0.95) rotate(-2deg); opacity: 1; }
      100% { transform: scale(1) rotate(-4deg); opacity: 1; }
    }
    .stamp-badge { animation: stampIn 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) both; transform-origin: center; }
    /* Toast de confirmation (ex: "Ajouté aux favoris") */
    @keyframes toastIn {
      0% { transform: translateY(-6px) scale(0.9); opacity: 0; }
      60% { transform: translateY(1px) scale(1.03); opacity: 1; }
      100% { transform: translateY(0) scale(1); opacity: 1; }
    }
    .toast-in { animation: toastIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) both; }
    /* Message de chat qui glisse à l'arrivée */
    @keyframes msgSlideIn { from { opacity: 0; transform: translateX(-8px); } to { opacity: 1; transform: translateX(0); } }
    .msg-slide-in { animation: msgSlideIn 0.3s ease both; }
    /* Retour tactile immédiat sur les boutons d'action */
    .rp-pressable { transition: transform 0.1s ease; }
    .rp-pressable:active { transform: scale(0.96); }
    /* Apparition en fondu au défilement (piloté par IntersectionObserver, voir Reveal.jsx) */
    .reveal-on-scroll { opacity: 0; transform: translateY(16px); transition: opacity 0.5s ease, transform 0.5s ease; }
    .reveal-on-scroll.revealed { opacity: 1; transform: translateY(0); }
    @keyframes rpShimmer { 0% { background-position: -300% 0; } 100% { background-position: 300% 0; } }
    .rp-shimmer { background: linear-gradient(90deg, ${T.surface2} 22%, ${T.line} 42%, ${T.surface2} 62%); background-size: 500% 100%; animation: rpShimmer 1.7s ease-in-out infinite; }
    .rp-ticket-sep {
      height: 1px; border: none; margin: 2px 0;
      background-image: repeating-linear-gradient(90deg, ${T.line} 0 7px, transparent 7px 14px);
    }
    .rp-barcode {
      height: 30px;
      background-image: repeating-linear-gradient(90deg, ${T.ink} 0 2px, transparent 2px 3px, ${T.ink} 3px 4px, transparent 4px 7px, ${T.ink} 7px 9px, transparent 9px 10px);
      opacity: 0.82;
    }
    /* Encoches façon coupon/ticket : demi-cercles "découpés" dans les bords
       gauche/droit de la carte, couleur du fond de page pour l'effet de trou. */
    .rp-ticket { position: relative; }
    .rp-ticket::before, .rp-ticket::after {
      content: '';
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: ${T.bg};
      z-index: 2;
    }
    .rp-ticket::before { left: -9px; }
    .rp-ticket::after { right: -9px; }
    /* Bandeau diagonal "alerte", réservé aux cartes ERREUR — même famille
       de technique que .rp-barcode (repeating-linear-gradient). */
    .rp-zigzag {
      height: 5px;
      border-radius: 3px;
      background-image: repeating-linear-gradient(-45deg, ${T.red} 0 6px, ${T.pink} 6px 12px);
      opacity: 0.9;
    }
    /* ══════════════════════════════════════════════════════════════
       PROFONDEUR 3D — inclinaison des cartes, scène radar du hero,
       fonds "aurora". Tout en CSS 3D (perspective + preserve-3d) :
       aucune bibliothèque 3D, aucun canvas, le bundle ne grossit pas.
       ══════════════════════════════════════════════════════════════ */

    /* — Carte qui s'incline vers le curseur (voir components/Tilt3D.jsx) — */
    .rp-tilt3d { perspective: 900px; --rx: 0deg; --ry: 0deg; --tz: 0px; --gx: 50%; --gy: 50%; --glare-o: 0; }
    .rp-tilt3d-inner {
      position: relative;
      height: 100%;
      transform: rotateX(var(--rx)) rotateY(var(--ry)) translateZ(var(--tz));
      transform-style: preserve-3d;
      transition: transform 260ms cubic-bezier(.2,.8,.2,1);
      will-change: transform;
    }
    /* Reflet qui suit le pointeur, posé au-dessus du contenu de la carte. */
    .rp-tilt3d-glare {
      position: absolute; inset: 0; border-radius: inherit; pointer-events: none;
      background: radial-gradient(420px circle at var(--gx) var(--gy), rgba(255,255,255,.10), transparent 42%);
      opacity: var(--glare-o);
      transition: opacity 260ms ease;
      z-index: 3;
    }

    /* — Scène radar 3D du hero (voir components/Hero3D.jsx) — */
    .rp-hero3d {
      position: absolute; top: 50%; left: 50%;
      /* Large : les étiquettes doivent pouvoir se placer bien à l'écart de la
         colonne de texte centrale (~560px) sans jamais la recouvrir. */
      width: 1180px; height: 620px;
      transform: translate(-50%, -50%);
      perspective: 1300px;
      pointer-events: none;
      z-index: 0;
      --mx: 0deg; --my: 0deg;
      /* Estompe les bords pour que la scène se fonde dans la page au lieu
         de s'arrêter net sur un rectangle. */
      -webkit-mask-image: radial-gradient(ellipse 60% 62% at 50% 50%, #000 44%, transparent 80%);
      mask-image: radial-gradient(ellipse 60% 62% at 50% 50%, #000 44%, transparent 80%);
    }
    .rp-hero3d-world {
      position: absolute; inset: 0;
      transform-style: preserve-3d;
      transform: rotateX(var(--my)) rotateY(var(--mx));
      transition: transform 400ms cubic-bezier(.2,.8,.2,1);
    }
    .rp-hero3d-disc {
      position: absolute; top: 50%; left: 50%;
      width: 470px; height: 470px; margin: -235px 0 0 -235px;
      transform-style: preserve-3d;
      /* Couché à plat façon table radar, puis tourné lentement. */
      transform: rotateX(70deg) rotateZ(0deg);
      animation: rpDiscSpin 46s linear infinite;
    }
    @keyframes rpDiscSpin { to { transform: rotateX(70deg) rotateZ(360deg); } }
    .rp-hero3d-ring {
      position: absolute; border-radius: 50%;
      border: 1px solid rgba(255,106,26,.20);
    }
    .rp-hero3d-ring:nth-child(1) { border-color: rgba(255,106,26,.26); }
    .rp-hero3d-ring:nth-child(3) { border-color: rgba(139,92,246,.20); }
    .rp-hero3d-grid {
      position: absolute; inset: 0; border-radius: 50%;
      background-image:
        repeating-linear-gradient(0deg, rgba(122,145,184,.10) 0 1px, transparent 1px 58px),
        repeating-linear-gradient(90deg, rgba(122,145,184,.10) 0 1px, transparent 1px 58px);
      -webkit-mask-image: radial-gradient(circle, #000 58%, transparent 76%);
      mask-image: radial-gradient(circle, #000 58%, transparent 76%);
    }
    /* Faisceau de balayage : un secteur de cône qui tourne sur le disque. */
    .rp-hero3d-beam {
      position: absolute; inset: 0; border-radius: 50%;
      background: conic-gradient(from 0deg, rgba(255,161,37,.32) 0deg, rgba(255,106,26,.10) 26deg, transparent 62deg);
      animation: rpSweep 4.2s linear infinite;
    }
    .rp-hero3d-core {
      position: absolute; top: 50%; left: 50%;
      width: 46px; height: 46px; margin: -23px 0 0 -23px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(255,161,37,.85), rgba(255,106,26,.12) 62%, transparent 72%);
      filter: blur(1px);
    }
    /* Ondes concentriques qui s'élèvent depuis le centre. */
    .rp-hero3d-pulse {
      position: absolute; top: 50%; left: 50%;
      width: 200px; height: 200px; margin: -100px 0 0 -100px;
      border-radius: 50%;
      border: 1.5px solid rgba(255,106,26,.42);
      transform: rotateX(70deg) scale(.28);
      animation: rpHeroPulse 4.8s ease-out infinite;
    }
    @keyframes rpHeroPulse {
      0%   { opacity: 0;   transform: rotateX(70deg) scale(.28) translateZ(0); }
      18%  { opacity: .75; }
      100% { opacity: 0;   transform: rotateX(70deg) scale(2.5) translateZ(90px); }
    }
    /* Étiquettes de prix flottant au-dessus du disque, chacune à sa profondeur. */
    .rp-hero3d-tag {
      position: absolute; top: 50%; left: 50%;
      font-family: 'Unbounded', system-ui, sans-serif;
      font-size: 12.5px; font-weight: 700; white-space: nowrap;
      padding: 8px 13px; border-radius: 10px;
      border: 1px solid currentColor;
      backdrop-filter: blur(7px);
      -webkit-backdrop-filter: blur(7px);
      transform: translate(-50%, -50%) translate3d(var(--tx), var(--ty), var(--tz)) scale(var(--ts));
      animation: rpTagFloat 7s ease-in-out infinite;
    }
    @keyframes rpTagFloat {
      0%, 100% { transform: translate(-50%, -50%) translate3d(var(--tx), var(--ty), var(--tz)) scale(var(--ts)); }
      50%      { transform: translate(-50%, -50%) translate3d(var(--tx), calc(var(--ty) - 16px), calc(var(--tz) + 26px)) scale(var(--ts)); }
    }
    @media (max-width: 1100px) {
      /* Sous cette largeur, l'écart entre la colonne de texte et les bords
         devient trop faible : les étiquettes finiraient sur le titre. On ne
         garde que le disque radar, qui lui reste bien derrière le texte. */
      .rp-hero3d-tag { display: none; }
      .rp-hero3d { width: 620px; height: 480px; opacity: .7; }
    }
    @media (max-width: 640px) {
      .rp-hero3d { width: 420px; height: 380px; opacity: .5; }
    }

    /* — Fond "aurora" : nappes de couleur lentes, très diffuses — */
    .rp-aurora { position: absolute; inset: 0; overflow: hidden; pointer-events: none; z-index: 0; }
    .rp-aurora span {
      position: absolute; border-radius: 50%;
      filter: blur(78px); opacity: .5;
      animation: rpAurora 19s ease-in-out infinite;
    }
    @keyframes rpAurora {
      0%, 100% { transform: translate3d(0,0,0) scale(1); }
      33%      { transform: translate3d(4%, -6%, 0) scale(1.14); }
      66%      { transform: translate3d(-5%, 4%, 0) scale(.92); }
    }

    /* — Bordure en dégradé (cartes premium) — */
    .rp-gradient-border { position: relative; }
    .rp-gradient-border::before {
      content: ''; position: absolute; inset: 0; border-radius: inherit; padding: 1px;
      background: linear-gradient(135deg, rgba(255,106,26,.55), rgba(139,92,246,.35) 48%, transparent 78%);
      -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
      -webkit-mask-composite: xor; mask-composite: exclude;
      pointer-events: none;
    }

    /* — Apparition au défilement avec profondeur (voir Reveal.jsx) — */
    .reveal-3d { opacity: 0; transform: perspective(900px) translateY(26px) rotateX(7deg); transition: opacity .62s cubic-bezier(.2,.8,.2,1), transform .62s cubic-bezier(.2,.8,.2,1); }
    .reveal-3d.revealed { opacity: 1; transform: perspective(900px) translateY(0) rotateX(0deg); }

    /* — Défilé horizontal continu (bandeau marchands) — */
    .rp-marquee { display: flex; overflow: hidden; -webkit-mask-image: linear-gradient(90deg, transparent, #000 12%, #000 88%, transparent); mask-image: linear-gradient(90deg, transparent, #000 12%, #000 88%, transparent); }
    .rp-marquee-track { display: flex; gap: 12px; flex-shrink: 0; padding-right: 12px; animation: rpMarquee 26s linear infinite; }
    @keyframes rpMarquee { to { transform: translateX(-100%); } }
    .rp-marquee:hover .rp-marquee-track { animation-play-state: paused; }

    /* — Infobulle d'explication : "Score 88/100" ne veut rien dire pour un
         visiteur qui découvre le site. La réponse est dans la FAQ, mais
         personne ne va la chercher au moment où le chiffre est affiché. — */
    .rp-hint { position: relative; border-bottom: 1px dotted ${T.muted}; cursor: help; }
    .rp-hint::after {
      content: attr(data-hint);
      position: absolute; bottom: calc(100% + 8px); left: 50%; transform: translateX(-50%);
      width: max-content; max-width: 230px;
      background: ${T.surface3}; color: ${T.ink};
      border: 1px solid ${T.line}; border-radius: 9px;
      padding: 9px 11px; font-size: 11.5px; font-weight: 500; line-height: 1.5;
      text-align: left; white-space: normal;
      box-shadow: 0 12px 30px rgba(0,0,0,.45);
      opacity: 0; visibility: hidden; transition: opacity .16s ease;
      z-index: 40; pointer-events: none;
    }
    .rp-hint:hover::after, .rp-hint:focus-visible::after { opacity: 1; visibility: visible; }
    /* Près du bord droit, l'infobulle sortirait de l'écran : on l'aligne à droite. */
    .rp-hint-end::after { left: auto; right: 0; transform: none; }

    /* — Pseudo d'un membre : rien n'indiquait qu'il menait quelque part.
         Soulignement au survol seulement, pour ne pas transformer chaque
         fil de commentaires en mur de liens bleus. — */
    .rp-author-name { transition: color .15s ease; }
    button:hover > span > .rp-author-name,
    button:focus-visible > span > .rp-author-name { color: ${T.emberLight}; text-decoration: underline; }

    /* — Barre d'onglets étroite (profil sur mobile) : défilement horizontal
         sans barre de défilement visible. — */
    .rp-scroll-x { scrollbar-width: none; -ms-overflow-style: none; }
    .rp-scroll-x::-webkit-scrollbar { display: none; }

    /* — Messages privés : deux volets côte à côte sur écran large, empilés
         sur téléphone où l'on passe de la liste au fil et retour. Avant, la
         liste des membres remplaçait la conversation : impossible de voir
         avec qui on parlait tout en lisant le fil. — */
    .rp-mp { display: grid; grid-template-columns: 288px 1fr; gap: 16px; align-items: start; }
    .rp-mp-liste {
      background: ${T.bgElevated}; border: 1px solid ${T.line};
      border-radius: ${T.radiusLg}px; padding: 12px;
      max-height: 520px; overflow-y: auto;
    }
    .rp-mp-retour { display: none; }
    @media (max-width: 780px) {
      .rp-mp { grid-template-columns: 1fr; }
      .rp-mp-liste { max-height: none; }
      /* Un seul volet à la fois : la liste disparaît quand un fil est ouvert. */
      .rp-mp-cache-mobile { display: none; }
      .rp-mp-retour { display: block; }
    }

    /* Ascenseur discret dans les fils et la liste des conversations. */
    .rp-fil::-webkit-scrollbar, .rp-mp-liste::-webkit-scrollbar { width: 8px; }
    .rp-fil::-webkit-scrollbar-thumb, .rp-mp-liste::-webkit-scrollbar-thumb {
      background: ${T.surface3}; border-radius: 999px;
    }
    .rp-fil, .rp-mp-liste { scrollbar-width: thin; scrollbar-color: ${T.surface3} transparent; }

    /* Champs de la messagerie : le contour blanc par défaut du navigateur
       jurait avec la charte. On le remplace par la couleur de la marque. */
    .rp-mp input:focus-visible, .rp-fil-saisie:focus-visible {
      outline: none; border-color: ${T.emberSolid};
      box-shadow: 0 0 0 3px rgba(255,106,26,.16);
    }

    /* — Sous-navigation de la communauté : intitulés complets sur écran
         large, abrégés sur téléphone pour que les trois onglets tiennent
         sans défilement horizontal. — */
    .rp-tab-short { display: none; }
    @media (max-width: 560px) {
      .rp-tab-long { display: none; }
      .rp-tab-short { display: inline; }
    }

    /* — Badges : relief, reflet balayant, apparition (voir BadgeHex.jsx) — */

    /* Apparition : le badge pivote légèrement pour se mettre face au lecteur,
       plutôt qu'un simple fondu. Les cartes sont décalées l'une après l'autre
       (animationDelay posé côté React). */
    @keyframes rp-badge-in {
      from { opacity: 0; transform: translateY(16px) rotateY(-34deg) scale(.93); }
      to   { opacity: 1; transform: none; }
    }
    .rp-badge-in { animation: rp-badge-in 540ms cubic-bezier(.2,.8,.2,1) both; }

    /* L'hexagone flotte au-dessus de sa carte : c'est ce qui creuse la
       profondeur quand la carte s'incline vers le curseur. Sans le
       preserve-3d posé sur la carte elle-même, ce translateZ serait aplati. */
    .rp-badge-hex {
      transform-style: preserve-3d;
      transition: transform 320ms cubic-bezier(.2,.8,.2,1), filter 320ms ease;
    }
    .rp-tilt3d:hover .rp-badge-hex {
      transform: translateZ(38px) scale(1.07);
      filter: drop-shadow(0 10px 18px var(--badge-glow));
    }

    /* Reflet qui balaie l'hexagone au survol : une lumière qui passe sur du
       métal gravé. Rejoué à chaque entrée du curseur. */
    .rp-badge-shine { transform-box: view-box; transform-origin: 0 0; transform: translateX(-60px); }
    .rp-tilt3d:hover .rp-badge-shine,
    .rp-badge-mini:hover .rp-badge-shine { animation: rp-badge-shine 780ms cubic-bezier(.3,.7,.4,1); }
    @keyframes rp-badge-shine {
      from { transform: translateX(-60px); }
      to   { transform: translateX(175px); }
    }

    /* Pastilles de niveau : elles se posent l'une après l'autre, ce qui fait
       littéralement compter le niveau à l'œil. */
    @keyframes rp-pip-in { from { opacity: 0; transform: scale(0); } to { opacity: 1; transform: scale(1); } }
    .rp-badge-pip { transform-box: fill-box; transform-origin: center; animation: rp-pip-in 420ms cubic-bezier(.2,1.5,.4,1) both; }

    /* Halo qui respire — réservé au dernier échelon, celui qui porte
       l'orange de la marque. Sur tous les niveaux, la page clignoterait. */
    @keyframes rp-badge-aura { 0%,100% { opacity:.22 } 50% { opacity:.62 } }
    .rp-badge-aura { animation: rp-badge-aura 3.4s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }

    /* Petits hexagones de la rangée de résumé : ils ne sont pas dans une
       carte inclinable, ils ont donc leur propre relief au survol. */
    .rp-badge-mini { display: inline-flex; transition: transform 260ms cubic-bezier(.2,.8,.2,1), filter 260ms ease; }
    .rp-badge-mini:hover { transform: translateY(-4px) scale(1.12); filter: drop-shadow(0 6px 12px var(--badge-glow)); }

    @media (prefers-reduced-motion: reduce) {
      .rp-badge-in { animation: none; opacity: 1; transform: none; }
      .rp-badge-pip, .rp-badge-aura { animation: none; }
      .rp-tilt3d:hover .rp-badge-shine, .rp-badge-mini:hover .rp-badge-shine { animation: none; }
      .rp-tilt3d:hover .rp-badge-hex, .rp-badge-mini:hover { transform: none; }
    }

    /* — Chiffres clés : léger relief au survol — */
    .rp-stat-tile { transition: transform 240ms cubic-bezier(.2,.8,.2,1), box-shadow 240ms cubic-bezier(.2,.8,.2,1), border-color 240ms ease; }
    .rp-tilt3d:hover .rp-stat-tile { border-color: rgba(255,106,26,.45); box-shadow: 0 20px 45px rgba(0,0,0,.4); }

    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after { animation: none !important; transition: none !important; }
      /* Sans animation, la scène radar n'apporte plus rien et resterait
         figée derrière le titre : on la retire complètement. */
      .rp-hero3d { display: none; }
      .reveal-3d { opacity: 1; transform: none; }
    }
    button:focus-visible, a:focus-visible, select:focus-visible, input:focus-visible { outline: 3px solid ${T.emberSolid}; outline-offset: 2px; }
    details.rp-faq { border-bottom: 1px solid ${T.line}; padding: 16px 0; }
    details.rp-faq summary { cursor: pointer; font-weight: 800; font-size: 15px; color: ${T.ink}; list-style: none; display: flex; justify-content: space-between; align-items: center; gap: 12px; }
    details.rp-faq summary::after { content: '+'; font-size: 20px; color: ${T.emberSolid}; flex-shrink: 0; }
    details.rp-faq[open] summary::after { content: '−'; }
    details.rp-faq p { margin-top: 10px; color: ${T.sub}; font-size: 14px; line-height: 1.65; }
    select, input { color-scheme: dark; }
    .rp-tab { display: inline-flex; align-items: center; gap: 5px; background: none; border: none; color: ${T.sub}; font-weight: 800; font-size: 13px; cursor: pointer; padding: 8px 13px; border-radius: 9px; font-family: 'Inter', system-ui, sans-serif; white-space: nowrap; transition: background .15s ease, color .15s ease; }
    .rp-tab:hover { color: ${T.ink}; background: rgba(255,106,53,0.1); }
    .rp-tab.active { color: #0C0E14; background: ${T.ember}; box-shadow: 0 2px 10px rgba(255,106,53,0.35); }
    .rp-dropdown-wrap { position: relative; }
    .rp-dropdown { position: absolute; top: calc(100% + 6px); left: 0; background: ${T.surface}; border: 1px solid ${T.line}; border-radius: 12px; padding: 6px; min-width: 220px; box-shadow: 0 16px 32px rgba(0,0,0,0.5); z-index: 60; animation: fadeUp .15s ease both; }
    .rp-dropdown-item { display: flex; align-items: center; gap: 8px; width: 100%; text-align: left; background: none; border: none; color: ${T.ink}; font-weight: 700; font-size: 13px; padding: 10px 11px; border-radius: 8px; cursor: pointer; font-family: 'Inter', system-ui, sans-serif; }
    .rp-dropdown-item:hover { background: ${T.surface2}; color: ${T.emberSolid}; }
    .rp-dropdown-item .rp-dropdown-desc { display: block; font-weight: 500; font-size: 11px; color: ${T.sub}; margin-top: 1px; }
    html, body { overflow-x: hidden; max-width: 100vw; }
    .rp-mobile-nav {
      display: none;
      position: fixed;
      bottom: 0; left: 0; right: 0;
      z-index: 55;
      background: rgba(12,14,20,0.96);
      backdrop-filter: blur(10px);
      border-top: 1px solid ${T.line};
      padding-bottom: env(safe-area-inset-bottom, 0);
    }
    @media (max-width: 640px) {
      .rp-mobile-nav { display: flex; }
      .rp-body { padding-bottom: 64px; }
      /* La rangée d'onglets du haut faisait doublon avec la barre fixe du bas
         et débordait sur deux lignes, mangeant un tiers de l'écran. */
      .rp-nav-tabs { display: none !important; }
      /* Le champ de recherche de la barre du haut se réduisait à une boîte
         vide de quelques pixels : masqué ici, la recherche pleine largeur
         sous le titre de page prend le relais. */
      .rp-nav-search { display: none !important; }
      .rp-mobile-search { display: block !important; }
      /* Cibles tactiles : 44px minimum, recommandation d'accessibilité. */
      .rp-tab { padding: 11px 14px; }
      /* Les encoches de coupon débordent hors de la carte : sur mobile les
         cartes touchent presque les bords de l'écran, elles se lisaient donc
         comme des pastilles noires posées par-dessus la bordure. */
      .rp-ticket::before, .rp-ticket::after { display: none; }
      /* Le hero prend moins de hauteur : sur un écran de téléphone, la barre
         de recherche se retrouvait sous la ligne de flottaison. */
      .rp-hero-inner { padding-top: 44px !important; padding-bottom: 40px !important; }
    }
    @media (max-width: 760px) {
      .rp-footer-grid { grid-template-columns: 1fr 1fr !important; }
    }
    @media (max-width: 460px) {
      .rp-footer-grid { grid-template-columns: 1fr !important; }
    }
    /* Le décollé vertical est désormais assuré par Tilt3D (translateZ) :
       ici on ne garde que la mise en évidence bordure + ombre, sinon les
       deux transformations se cumuleraient et la carte sauterait. */
    .rp-deal-card { transition: border-color 160ms cubic-bezier(.2,.8,.2,1), box-shadow 160ms cubic-bezier(.2,.8,.2,1); }
    .rp-tilt3d:hover .rp-deal-card { border-color: ${T.emberSolid}; box-shadow: ${T.shadowCardHover}; }
    .rp-mobile-nav button { transition: color .15s ease; }
  `}</style>
);

/* Écran d'attente d'une vue chargée à la demande (voir Suspense/lazy).
   Reprend le gabarit de la fiche produit pour éviter que la page ne saute
   quand le vrai contenu arrive. */
function ViewLoader() {
  return (
    <main style={{ maxWidth: 980, margin: "0 auto", padding: "18px 16px 60px" }} aria-busy="true">
      <div className="rp-shimmer" style={{ height: 14, width: 220, borderRadius: 6, marginBottom: 20 }} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 16 }}>
        <div className="rp-shimmer" style={{ height: 420, borderRadius: 14 }} />
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="rp-shimmer" style={{ height: 200, borderRadius: 14 }} />
          <div className="rp-shimmer" style={{ height: 200, borderRadius: 14 }} />
        </div>
      </div>
    </main>
  );
}

/* ── Barre de recherche ─────────────────────────────────────── */
function SearchBar({ onSearch, big, placeholder }) {
  const [q, setQ] = useState("");
  const go = () => {
    if (q.trim()) {
      onSearch(q.trim());
      setQ("");
    }
  };
  return (
    <div style={{ display: "flex", gap: 8, width: "100%" }}>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && go()}
        placeholder={placeholder || "Rechercher un produit, une marque…"}
        aria-label="Rechercher un produit"
        style={{
          flex: 1,
          padding: big ? "16px 18px" : "11px 14px",
          borderRadius: big ? 14 : 10,
          border: `1.5px solid ${T.line}`,
          fontSize: big ? 16 : 14,
          background: T.surface2,
          color: T.ink,
          fontFamily: "'Inter', system-ui, sans-serif",
          minWidth: 0,
        }}
      />
      <button
        onClick={go}
        aria-label="Lancer la recherche"
        className="rp-cta"
        style={{
          padding: big ? "0 24px" : "0 18px",
          borderRadius: big ? 14 : 10,
          border: "none",
          background: T.ember,
          color: "#0C0E14",
          fontWeight: 900,
          fontSize: big ? 15 : 13,
          cursor: "pointer",
          fontFamily: "'Inter', system-ui, sans-serif",
          flexShrink: 0,
        }}
      >
        {big ? "Rechercher" : <Icon name="search" size={16} />}
      </button>
    </div>
  );
}



function AuthModal({ onClose, onSuccess }) {
  const [mode, setMode] = useState("login"); // login | register
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const data = await apiAuth(mode === "login" ? "login" : "register", { email, password });
      onSuccess(data.token, data.user, mode === "register");
    } catch (e2) {
      setError(e2.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div role="dialog" aria-modal="true" onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, zIndex: 100 }}>
      <form onClick={(e) => e.stopPropagation()} onSubmit={submit} className="rp-modal-in" style={{ background: T.surface, border: `1px solid ${T.line}`, borderRadius: 16, padding: "26px 22px", maxWidth: 380, width: "100%" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <h3 className="rp-display" style={{ fontSize: 17, color: T.ink }}>{mode === "login" ? "Connexion" : "Créer un compte"}</h3>
          <button type="button" onClick={onClose} aria-label="Fermer" style={{ border: "none", background: "none", fontSize: 22, cursor: "pointer", color: T.sub, width: 40, height: 40, borderRadius: 8, flexShrink: 0 }}>×</button>
        </div>

        <label style={{ display: "block", fontSize: 12, color: T.sub, marginBottom: 4 }}>Email</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ width: "100%", padding: "11px 12px", borderRadius: 10, border: `1.5px solid ${T.line}`, background: T.surface2, color: T.ink, fontSize: 14, marginBottom: 12, fontFamily: "'Inter', sans-serif" }}
        />

        <label style={{ display: "block", fontSize: 12, color: T.sub, marginBottom: 4 }}>Mot de passe {mode === "register" && "(8 caractères min.)"}</label>
        <input
          type="password"
          required
          minLength={mode === "register" ? 8 : undefined}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ width: "100%", padding: "11px 12px", borderRadius: 10, border: `1.5px solid ${T.line}`, background: T.surface2, color: T.ink, fontSize: 14, marginBottom: 16, fontFamily: "'Inter', sans-serif" }}
        />

        {error && <div style={{ color: T.red, fontSize: 13, marginBottom: 12 }}>{error}</div>}

        <button type="submit" disabled={loading} style={{ width: "100%", padding: "13px", borderRadius: 10, border: "none", background: loading ? T.surface2 : T.ember, color: loading ? T.sub : "#0C0E14", fontWeight: 900, fontSize: 14, cursor: loading ? "default" : "pointer", fontFamily: "'Inter', sans-serif" }}>
          {loading ? "…" : mode === "login" ? "Se connecter" : "Créer mon compte"}
        </button>

        <button
          type="button"
          onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(null); }}
          style={{ width: "100%", marginTop: 12, background: "none", border: "none", color: T.sub, fontSize: 13, cursor: "pointer", textAlign: "center" }}
        >
          {mode === "login" ? "Pas encore de compte ? Inscris-toi" : "Déjà un compte ? Connecte-toi"}
        </button>
      </form>
    </div>
  );
}

/* ── Menu déroulant de profil ──────────────────────────────── */
function ProfileMenu({ user, role, onOpenSettings, onLogout, onOpenAdmin, onOpenProfile }) {
  return (
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        position: "absolute",
        top: "calc(100% + 8px)",
        right: 0,
        width: 240,
        background: T.surface,
        border: `1px solid ${T.line}`,
        borderRadius: 14,
        padding: 12,
        boxShadow: "0 16px 40px rgba(0,0,0,0.5)",
        zIndex: 60,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 8px 14px" }}>
        <Avatar email={user.email} pseudo={user.pseudo} avatarUrl={user.avatar_url} size={38} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: 13.5, color: T.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {user.pseudo || user.email}
          </div>
          <div style={{ fontSize: 11, color: T.sub }}>{role === "admin" ? <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><Icon name="shield" size={12} color={T.yellow} /> Administrateur</span> : "Membre"}</div>
        </div>
      </div>

      {[
        // Le profil public en premier : c'est ce que les autres membres
        // voient, et jusqu'ici rien ne permettait d'y accéder.
        { icon: "user", label: "Mon profil public", action: onOpenProfile, color: T.ink },
        { icon: "settings", label: "Paramètres du compte", action: onOpenSettings, color: T.ink },
        ...(role === "admin"
          ? [{ icon: "shield", label: "Tableau de bord admin", action: onOpenAdmin, color: T.yellow }]
          : []),
        { icon: "refresh", label: "Se déconnecter", action: onLogout, color: T.sub },
      ].map(({ icon, label, action, color }) => (
        <button
          key={label}
          onClick={action}
          style={{ display: "flex", alignItems: "center", gap: 9, width: "100%", textAlign: "left", padding: "10px 8px", borderRadius: 8, border: "none", background: "transparent", color, fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}
        >
          <Icon name={icon} size={15} />
          {label}
        </button>
      ))}
    </div>
  );
}

/* ── Paramètres du compte : modale à onglets (Compte / Sécurité) ─ */
/* ── Paramètres : les membres que l'on suit ──────────────────────
   Sans cette liste, on ne pouvait se désabonner qu'en retrouvant chaque
   profil un par un — et rien ne permettait de savoir qui l'on suivait. */
function FollowedMembersPanel({ token, onOpenProfile }) {
  const [suivis, setSuivis] = useState(null);
  const [erreur, setErreur] = useState(null);
  const [enCours, setEnCours] = useState(null); // id en cours de désabonnement

  useEffect(() => {
    apiFollowingFeed(token)
      .then((d) => setSuivis(d.suivis || []))
      .catch((e) => { setErreur(e.message); setSuivis([]); });
  }, [token]);

  const seDesabonner = async (id) => {
    setEnCours(id);
    setErreur(null);
    try {
      await apiFollowMember(token, String(id), false);
      setSuivis((p) => p.filter((m) => m.id !== id));
    } catch (e) {
      setErreur(e.message);
    } finally {
      setEnCours(null);
    }
  };

  const carte = { background: T.surface2, border: `1px solid ${T.line}`, borderRadius: 12, padding: 16, marginBottom: 14 };

  return (
    <div style={carte}>
      <h4 style={{ fontSize: 13.5, fontWeight: 800, color: T.ink, marginBottom: 4 }}>Membres suivis</h4>
      <p style={{ fontSize: 12, color: T.sub, marginBottom: 14 }}>
        Leurs nouveaux deals apparaissent dans ton fil. Suivre quelqu'un est public de ton côté :
        le membre voit son nombre d'abonnés, jamais qui ils sont.
      </p>

      {erreur && <p style={{ fontSize: 12, color: T.red, marginBottom: 10 }}>{erreur}</p>}

      {suivis === null && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[0, 1].map((i) => <div key={i} className="rp-shimmer" style={{ height: 46, borderRadius: 10 }} />)}
        </div>
      )}

      {suivis?.length === 0 && (
        <p style={{ fontSize: 12.5, color: T.muted, lineHeight: 1.6 }}>
          Tu ne suis personne pour l'instant. Sur le profil d'un membre dont les trouvailles te
          plaisent, le bouton « Suivre » le fait apparaître ici.
        </p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {suivis?.map((m) => (
          <div
            key={m.id}
            style={{
              display: "flex", alignItems: "center", gap: 10,
              background: T.surface, border: `1px solid ${T.line}`,
              borderRadius: 10, padding: "9px 12px",
            }}
          >
            <button
              onClick={() => onOpenProfile(m.id)}
              style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0, background: "none", border: "none", padding: 0, cursor: "pointer", textAlign: "left" }}
            >
              <Avatar email={m.display_name} avatarUrl={m.avatar_url} size={28} />
              <span style={{ fontSize: 13, fontWeight: 700, color: T.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {m.display_name}
              </span>
            </button>
            <button
              onClick={() => seDesabonner(m.id)}
              disabled={enCours === m.id}
              style={{
                padding: "6px 12px", borderRadius: 8, border: `1.5px solid ${T.line}`,
                background: "transparent", color: T.sub, fontWeight: 800, fontSize: 12,
                cursor: enCours === m.id ? "wait" : "pointer", fontFamily: "'Inter', sans-serif", whiteSpace: "nowrap",
              }}
            >
              {enCours === m.id ? "…" : "Ne plus suivre"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function SettingsModal({ user, token, onClose, onUpdated, onAccountDeleted }) {
  const [tab, setTab] = useState("compte"); // compte | abonnements | securite

  // Onglet Compte
  const [pseudo, setPseudo] = useState(user.pseudo || "");
  const [avatarUrl, setAvatarUrl] = useState(user.avatar_url || "");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState(null);

  const saveProfile = async () => {
    setSavingProfile(true);
    setProfileMsg(null);
    try {
      const updated = await apiUpdateProfile(token, { pseudo, avatarUrl });
      onUpdated(updated);
      setProfileMsg("✓ Profil mis à jour");
    } catch (e) {
      setProfileMsg("Erreur : " + e.message);
    } finally {
      setSavingProfile(false);
    }
  };

  // Onglet Sécurité — mot de passe
  const [oldPw, setOldPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [savingPw, setSavingPw] = useState(false);
  const [pwMsg, setPwMsg] = useState(null);

  const changePassword = async () => {
    setPwMsg(null);
    if (newPw.length < 8) return setPwMsg("Erreur : le nouveau mot de passe doit faire au moins 8 caractères.");
    if (newPw !== confirmPw) return setPwMsg("Erreur : les deux mots de passe ne correspondent pas.");
    setSavingPw(true);
    try {
      await apiChangePassword(token, oldPw, newPw);
      setPwMsg("✓ Mot de passe changé");
      setOldPw(""); setNewPw(""); setConfirmPw("");
    } catch (e) {
      setPwMsg("Erreur : " + e.message);
    } finally {
      setSavingPw(false);
    }
  };

  // Onglet Sécurité — suppression de compte
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePw, setDeletePw] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteMsg, setDeleteMsg] = useState(null);

  const deleteAccount = async () => {
    setDeleting(true);
    setDeleteMsg(null);
    try {
      await apiDeleteAccount(token, deletePw);
      onAccountDeleted();
    } catch (e) {
      setDeleteMsg(e.message);
      setDeleting(false);
    }
  };

  const inputStyle = { width: "100%", padding: "10px 12px", borderRadius: 8, border: `1.5px solid ${T.line}`, background: T.surface2, color: T.ink, fontSize: 13.5, fontFamily: "'Inter', sans-serif" };
  const cardStyle = { background: T.surface2, border: `1px solid ${T.line}`, borderRadius: 12, padding: 16, marginBottom: 14 };
  const btnStyle = (disabled) => ({ padding: "10px 18px", borderRadius: 8, border: "none", background: disabled ? T.line : T.ember, color: disabled ? T.sub : "#0C0E14", fontWeight: 800, fontSize: 13, cursor: disabled ? "default" : "pointer", fontFamily: "'Inter', sans-serif" });

  return (
    <div role="dialog" aria-modal="true" onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", padding: 14, zIndex: 100 }}>
      <div onClick={(e) => e.stopPropagation()} className="rp-modal-in" style={{ background: T.surface, border: `1px solid ${T.line}`, borderRadius: 16, width: "100%", maxWidth: 620, maxHeight: "88vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 20px", borderBottom: `1px solid ${T.line}` }}>
          <h3 className="rp-display" style={{ fontSize: 16, color: T.ink }}><Icon name="settings" size={15} /> Paramètres</h3>
          <button onClick={onClose} aria-label="Fermer" style={{ border: "none", background: "none", fontSize: 22, cursor: "pointer", color: T.sub, width: 40, height: 40, borderRadius: 8, flexShrink: 0 }}>×</button>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap" }}>
          <div style={{ display: "flex", flexDirection: "row", gap: 4, padding: "14px 12px", borderBottom: `1px solid ${T.line}`, width: "100%", overflowX: "auto" }}>
            <button onClick={() => setTab("compte")} style={{ padding: "8px 14px", borderRadius: 8, border: "none", background: tab === "compte" ? T.surface2 : "transparent", color: tab === "compte" ? T.ink : T.sub, fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "'Inter', sans-serif", whiteSpace: "nowrap", flexShrink: 0 }}>
              <Icon name="user" size={15} /> Compte général
            </button>
            <button onClick={() => setTab("abonnements")} style={{ padding: "8px 14px", borderRadius: 8, border: "none", background: tab === "abonnements" ? T.surface2 : "transparent", color: tab === "abonnements" ? T.ink : T.sub, fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "'Inter', sans-serif", whiteSpace: "nowrap", flexShrink: 0 }}>
              <Icon name="users" size={15} /> Membres suivis
            </button>
            <button onClick={() => setTab("securite")} style={{ padding: "8px 14px", borderRadius: 8, border: "none", background: tab === "securite" ? T.surface2 : "transparent", color: tab === "securite" ? T.ink : T.sub, fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "'Inter', sans-serif", whiteSpace: "nowrap", flexShrink: 0 }}>
              <Icon name="lock" size={15} /> Confidentialité & sécurité
            </button>
          </div>

          <div style={{ padding: 20, width: "100%" }}>
            {tab === "compte" && (
              <div style={cardStyle}>
                <h4 style={{ fontSize: 13.5, fontWeight: 800, color: T.ink, marginBottom: 4 }}>Profil public</h4>
                <p style={{ fontSize: 12, color: T.sub, marginBottom: 14 }}>Visible par les autres membres dans le salon et les commentaires.</p>

                <label style={{ display: "block", fontSize: 11.5, color: T.sub, marginBottom: 4 }}>Email (privé, jamais affiché publiquement)</label>
                <input value={user.email} disabled style={{ ...inputStyle, marginBottom: 14, opacity: 0.6, cursor: "not-allowed" }} />

                <label style={{ display: "block", fontSize: 11.5, color: T.sub, marginBottom: 4 }}>Pseudo</label>
                <input value={pseudo} onChange={(e) => setPseudo(e.target.value)} maxLength={30} placeholder="Ton pseudo" style={{ ...inputStyle, marginBottom: 14 }} />

                <AvatarPicker value={avatarUrl} onChange={setAvatarUrl} email={user.email} pseudo={pseudo} />

                {profileMsg && <p style={{ fontSize: 12, color: profileMsg.startsWith("Erreur") ? T.red : T.green, marginBottom: 10 }}>{profileMsg}</p>}
                <button onClick={saveProfile} disabled={savingProfile} style={btnStyle(savingProfile)}>
                  {savingProfile ? "…" : "Enregistrer"}
                </button>
              </div>
            )}

            {tab === "abonnements" && <FollowedMembersPanel token={token} onOpenProfile={(h) => { onClose(); ouvrirProfil(h); }} />}

            {tab === "securite" && (
              <>
                <div style={cardStyle}>
                  <h4 style={{ fontSize: 13.5, fontWeight: 800, color: T.ink, marginBottom: 14 }}>Mot de passe</h4>
                  <label style={{ display: "block", fontSize: 11.5, color: T.sub, marginBottom: 4 }}>Mot de passe actuel</label>
                  <input type="password" value={oldPw} onChange={(e) => setOldPw(e.target.value)} style={{ ...inputStyle, marginBottom: 12 }} />
                  <label style={{ display: "block", fontSize: 11.5, color: T.sub, marginBottom: 4 }}>Nouveau mot de passe</label>
                  <input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} style={{ ...inputStyle, marginBottom: 12 }} />
                  <label style={{ display: "block", fontSize: 11.5, color: T.sub, marginBottom: 4 }}>Confirmer le nouveau mot de passe</label>
                  <input type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} style={{ ...inputStyle, marginBottom: 14 }} />
                  {pwMsg && <p style={{ fontSize: 12, color: pwMsg.startsWith("Erreur") ? T.red : T.green, marginBottom: 10 }}>{pwMsg}</p>}
                  <button onClick={changePassword} disabled={savingPw} style={btnStyle(savingPw)}>
                    {savingPw ? "…" : "Changer le mot de passe"}
                  </button>
                </div>

                <div style={{ ...cardStyle, border: `1px solid ${T.red}55`, marginBottom: 0 }}>
                  <h4 style={{ fontSize: 13.5, fontWeight: 800, color: T.red, marginBottom: 4 }}>Zone de danger</h4>
                  <p style={{ fontSize: 12, color: T.sub, marginBottom: 14 }}>Supprime définitivement ton compte, tes favoris, commentaires et messages. Action irréversible.</p>

                  {!showDeleteConfirm ? (
                    <button onClick={() => setShowDeleteConfirm(true)} style={{ padding: "10px 18px", borderRadius: 8, border: `1.5px solid ${T.red}`, background: "transparent", color: T.red, fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>
                      Supprimer mon compte
                    </button>
                  ) : (
                    <>
                      <label style={{ display: "block", fontSize: 11.5, color: T.sub, marginBottom: 4 }}>Confirme avec ton mot de passe</label>
                      <input type="password" value={deletePw} onChange={(e) => setDeletePw(e.target.value)} style={{ ...inputStyle, marginBottom: 10 }} />
                      {deleteMsg && <p style={{ fontSize: 12, color: T.red, marginBottom: 10 }}>{deleteMsg}</p>}
                      <div style={{ display: "flex", gap: 8 }}>
                        <button onClick={deleteAccount} disabled={deleting} style={{ padding: "10px 18px", borderRadius: 8, border: "none", background: T.red, color: "#fff", fontWeight: 800, fontSize: 13, cursor: deleting ? "default" : "pointer", fontFamily: "'Inter', sans-serif" }}>
                          {deleting ? "…" : "Confirmer la suppression"}
                        </button>
                        <button onClick={() => { setShowDeleteConfirm(false); setDeletePw(""); setDeleteMsg(null); }} style={{ padding: "10px 18px", borderRadius: 8, border: `1.5px solid ${T.line}`, background: "transparent", color: T.sub, fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>
                          Annuler
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Charge une seule fois le flux de deals de la page d'accueil.
 * Les trois sections (chiffres clés, erreurs, pépites) partageaient la même
 * requête /api/deals mais la lançaient chacune de leur côté : trois appels
 * réseau identiques à chaque chargement. Elles lisent maintenant ce hook.
 * @returns {{items: Array|null|undefined, total: number}} items undefined =
 *   chargement en cours, null = backend injoignable.
 */
function useHomeFeed() {
  const [feed, setFeed] = useState({ items: undefined, total: 0 });

  useEffect(() => {
    let cancelled = false;
    fetchDeals("tout", 1, 50)
      .then((data) => { if (!cancelled) setFeed({ items: data.items || [], total: data.total || 0 }); })
      .catch(() => { if (!cancelled) setFeed({ items: null, total: 0 }); });
    return () => { cancelled = true; };
  }, []);

  return feed;
}

/**
 * Écran vide travaillé : le catalogue peut rester vide un moment (scan
 * planifié, quota de l'API de prix épuisé…). Une simple ligne de texte
 * perdue au milieu du vide donnait l'impression d'un site cassé, juste
 * sous un titre qui promet une "détection active en continu".
 */
function EmptyFeed({ tone = "deal", title, text, action }) {
  const accent = tone === "erreur" ? T.red : T.emberSolid;
  return (
    <div
      style={{
        display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center",
        gap: 12, padding: "44px 24px",
        background: T.gradSurface, border: `1px dashed ${T.line}`, borderRadius: T.radiusLg,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          width: 56, height: 56, borderRadius: "50%",
          background: `${accent}14`, border: `1px solid ${accent}3a`,
        }}
      >
        <Icon name="radar" size={26} color={accent} />
      </span>
      <h3 className="rp-display" style={{ fontSize: 16, fontWeight: 900, color: T.ink }}>{title}</h3>
      <p style={{ fontSize: 13, color: T.sub, lineHeight: 1.6, maxWidth: 420 }}>{text}</p>
      {action}
    </div>
  );
}

/* ── Section "Pépites du moment" de la homepage ── */
function HomeDealsSection({ feed, authToken, onNeedAuth, onSeeAll, onOpenDetail, onSearch }) {
  // Les erreurs de prix ont leur propre section : on ne garde ici que les
  // deals normaux, pour ne pas les afficher deux fois.
  const items = feed.items === undefined ? undefined
    : feed.items === null ? null
    : feed.items.filter((it) => it.verdict !== "erreur").slice(0, 4);

  if (items === null) return null;

  return (
    <section style={{ maxWidth: 1200, margin: "0 auto", padding: "44px 18px 10px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <h2 className="rp-display" style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 22, fontWeight: 900 }}><Icon name="flame" size={22} color={T.emberSolid} /> Pépites du moment</h2>
        {items && items.length > 0 && (
          <button
            onClick={onSeeAll}
            style={{ background: "none", border: "none", color: T.emberSolid, fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}
          >
            Voir tous les deals →
          </button>
        )}
      </div>
      {items === undefined && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 14 }}>
          {[0, 1, 2, 3].map((i) => <SkeletonCard key={`home-skel-${i}`} />)}
        </div>
      )}
      {items && items.length === 0 && (
        <EmptyFeed
          title="Aucune pépite pour le moment"
          text="Le scan compare les prix par lots, à intervalle régulier. Les bons plans apparaîtront ici dès qu'un écart significatif sera détecté — en attendant, tu peux lancer une recherche sur un produit précis."
          action={
            <button
              onClick={() => onSearch && onSearch()}
              className="rp-cta"
              style={{ marginTop: 4, background: T.ember, border: "none", borderRadius: 10, padding: "11px 20px", color: "#0C0E14", fontSize: 13, fontWeight: 900, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}
            >
              Chercher un produit
            </button>
          }
        />
      )}
      {items && items.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 14 }}>
          {items.map((it, i) => (
            <DealCard key={i} item={it} index={i} authToken={authToken} onNeedAuth={onNeedAuth} onOpenDetail={onOpenDetail} />
          ))}
        </div>
      )}
    </section>
  );
}

/* ── Section "Erreurs de prix détectées" — le cœur du produit, donc placée
   AVANT les pépites sur la page d'accueil. Même source que HomeDealsSection
   (useHomeFeed), filtrée sur verdict "erreur". ── */
function HomeErrorsSection({ feed, authToken, onNeedAuth, onSeeAll, onOpenDetail, onNeedAlert }) {
  const items = feed.items === undefined ? undefined
    : feed.items === null ? null
    : feed.items.filter((it) => it.verdict === "erreur").slice(0, 3);

  // Ne disparaît plus quand la liste est vide : c'est la promesse principale
  // du site, la masquer donnait l'impression que la fonctionnalité n'existe pas.
  if (items === null) return null;

  return (
    <section style={{ maxWidth: 1200, margin: "0 auto", padding: "40px 18px 10px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <h2 className="rp-display" style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 22, fontWeight: 900 }}><Icon name="alertCircle" size={22} color={T.red} /> Erreurs de prix détectées</h2>
        {items && items.length > 0 && (
          <button
            onClick={onSeeAll}
            style={{ background: "none", border: "none", color: T.red, fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}
          >
            Voir toutes les erreurs →
          </button>
        )}
      </div>
      {items === undefined && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 14 }}>
          {[0, 1].map((i) => <SkeletonCard key={`err-skel-${i}`} />)}
        </div>
      )}
      {items && items.length === 0 && (
        <EmptyFeed
          tone="erreur"
          title="Aucune erreur de prix en ce moment"
          text="C'est normal : une vraie erreur de prix est rare et ne dure souvent que quelques heures. Crée une alerte pour être prévenu par email dès qu'on en repère une, au lieu de rafraîchir la page."
          action={
            <button
              onClick={() => onNeedAlert && onNeedAlert()}
              className="rp-cta"
              style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4, background: T.gradDanger, border: "none", borderRadius: 10, padding: "11px 20px", color: "#fff", fontSize: 13, fontWeight: 900, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}
            >
              <Icon name="bell" size={15} /> Me prévenir par email
            </button>
          }
        />
      )}
      {items && items.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 14 }}>
          {items.map((it, i) => (
            <DealCard key={i} item={it} index={i} variant="price-error" authToken={authToken} onNeedAuth={onNeedAuth} onOpenDetail={onOpenDetail} />
          ))}
        </div>
      )}
    </section>
  );
}

/* ── Bandeau de statistiques réelles — calculées à partir de /api/deals
   (route publique existante), pas d'une route de stats dédiée qui
   n'existe pas encore. Pas de framing "aujourd'hui" : on ne connaît pas
   la date de détection ligne à ligne, donc on affiche des totaux vrais
   plutôt que des chiffres quotidiens inventés. ── */
function HomeStatsBar({ feed }) {
  // undefined = chargement, null = backend injoignable
  const stats = feed.items === undefined ? undefined
    : feed.items === null ? null
    : {
        total: feed.total,
        sellers: new Set(feed.items.map((it) => it.seller).filter(Boolean)).size,
        errors: feed.items.filter((it) => it.verdict === "erreur").length,
      };

  if (stats === null) return null;

  // Catalogue vide : trois gros "0" mis en avant juste sous un titre qui
  // promet une détection continue, c'est une contradiction frontale. On
  // affiche à la place ce que le site fait réellement en attendant.
  if (stats && stats.total === 0) {
    return (
      <section style={{ maxWidth: 1200, margin: "-34px auto 0", padding: "0 18px", position: "relative", zIndex: 2 }}>
        <div
          className="fade-up rp-gradient-border"
          style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 12, flexWrap: "wrap",
            background: T.gradSurface, border: `1px solid ${T.line}`, borderRadius: T.radiusLg,
            padding: "16px 22px", boxShadow: T.shadowCard, textAlign: "center",
          }}
        >
          <span className="rp-fresh-dot" aria-hidden="true" />
          <span style={{ fontSize: 13.5, color: T.sub, lineHeight: 1.5 }}>
            Le prochain lot de produits est en cours d'analyse — les premiers résultats s'afficheront ici.
          </span>
        </div>
      </section>
    );
  }

  const tiles = [
    { icon: "radar", label: "Deals actifs détectés", value: stats?.total, iconBg: "#1A1330", iconColor: T.purple },
    { icon: "store", label: "Marchands identifiés", value: stats?.sellers, iconBg: "#2E2318", iconColor: T.yellow },
    { icon: "alertCircle", label: "Erreurs de prix en cours", value: stats?.errors, iconBg: "#2C1420", iconColor: T.pink },
  ];

  return (
    <section style={{ maxWidth: 1200, margin: "-34px auto 0", padding: "0 18px", position: "relative", zIndex: 2 }}>
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", justifyContent: "center" }}>
        {tiles.map((t, i) => (
          <Tilt3D key={t.label} max={11} lift={14} style={{ flex: "1 1 230px", maxWidth: 300 }}>
            <div
              className="rp-stat-tile rp-gradient-border fade-up"
              style={{
                display: "flex", alignItems: "center", gap: 14,
                background: T.gradSurface,
                border: `1px solid ${T.line}`,
                borderRadius: T.radiusLg,
                padding: "17px 20px",
                boxShadow: T.shadowCard,
                animationDelay: `${i * 90}ms`,
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center",
                  width: 46, height: 46, borderRadius: 13, background: t.iconBg,
                  flexShrink: 0,
                  border: `1px solid ${t.iconColor}2e`,
                  boxShadow: `0 6px 18px ${t.iconColor}26`,
                  transform: "translateZ(28px)",
                }}
              >
                <Icon name={t.icon} size={21} color={t.iconColor} />
              </span>
              <div style={{ transform: "translateZ(16px)" }}>
                <div className="rp-display" style={{ fontSize: 25, fontWeight: 900, color: T.ink, minHeight: 30, lineHeight: 1.15 }}>
                  {stats === undefined
                    ? <span className="rp-shimmer" style={{ display: "inline-block", width: 46, height: 19, borderRadius: 5 }} />
                    : <CountUp to={t.value} />}
                </div>
                <div style={{ fontSize: 11.5, color: T.sub, marginTop: 1 }}>{t.label}</div>
              </div>
            </div>
          </Tilt3D>
        ))}
      </div>
    </section>
  );
}

/* Compteur qui monte de 0 à `to` — donne du poids aux chiffres clés sans
   les inventer : la valeur finale reste exactement celle du backend. */
function CountUp({ to, duration = 900 }) {
  const [n, setN] = useState(0);

  useEffect(() => {
    const target = Number(to) || 0;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || target === 0) {
      setN(target);
      return;
    }
    let raf;
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min((now - start) / duration, 1);
      // easeOutCubic : démarrage rapide, arrivée douce sur la valeur exacte.
      setN(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, duration]);

  return <>{n}</>;
}

function FilterChip({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "8px 13px",
        borderRadius: 20,
        border: `1.5px solid ${active ? T.emberSolid : T.line}`,
        background: active ? "rgba(255,106,53,0.15)" : "transparent",
        color: active ? T.ink : T.sub,
        fontWeight: 700,
        fontSize: 12,
        cursor: "pointer",
        whiteSpace: "nowrap",
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      {children}
    </button>
  );
}

/* ── Pages légales ──────────────────────────────────────────── */
const LEGAL = {
  mentions: {
    title: "Mentions légales",
    body: `Éditeur du site : [Nom / raison sociale à compléter]
Statut : [auto-entrepreneur, SAS…] — SIREN : [à compléter]
Adresse : [à compléter] — Contact : [email à compléter]
Directeur de la publication : [à compléter]
Hébergeur du site : [à compléter] — Hébergeur du backend : Railway Corp.

RadarPrix est un service d'information sur les prix. Les offres affichées proviennent d'une analyse automatique de données de marchés (Google Shopping) ; RadarPrix n'est ni vendeur, ni intermédiaire de vente.`,
  },
  cgu: {
    title: "Conditions générales d'utilisation",
    body: `1. Objet — RadarPrix détecte des variations de prix inhabituelles sur des sites marchands tiers et les présente à titre purement informatif, via un algorithme de comparaison de prix.

2. Absence de garantie — Les prix, remises et disponibilités affichés sont estimés au moment du scan et peuvent changer à tout moment. RadarPrix ne garantit ni l'exactitude des offres, ni leur maintien par le vendeur. En droit français, un vendeur peut annuler une commande en cas d'erreur manifeste sur le prix (prix dérisoire).

3. Responsabilité — L'utilisateur reste seul responsable de ses achats. Vérifiez systématiquement l'offre, le vendeur et les conditions sur le site marchand avant tout paiement.

4. Usage — Le service est fourni « en l'état », pour un usage personnel et raisonnable.`,
  },
  confidentialite: {
    title: "Politique de confidentialité",
    body: `RadarPrix ne crée pas de compte et ne dépose pas de cookie publicitaire.

Les recherches que vous lancez sont envoyées à notre serveur, qui interroge Google Shopping (via SerpApi) pour trouver les prix actuels. L'historique des prix consultés est conservé côté serveur pour améliorer la détection, sans donnée personnelle associée.

Pour toute question : [email de contact à compléter].

[À faire relire par un professionnel avant mise en ligne commerciale — RGPD.]`,
  },
};

function LegalModal({ page, onClose }) {
  if (!page) return null;
  const { title, body } = LEGAL[page];
  return (
    <div role="dialog" aria-modal="true" aria-label={title} onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, zIndex: 100 }}>
      <div onClick={(e) => e.stopPropagation()} className="rp-modal-in" style={{ background: T.surface, border: `1px solid ${T.line}`, borderRadius: 16, padding: "26px 22px", maxWidth: 560, maxHeight: "80vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h3 className="rp-display" style={{ fontSize: 17, color: T.ink }}>{title}</h3>
          <button onClick={onClose} aria-label="Fermer" style={{ border: "none", background: "none", fontSize: 22, cursor: "pointer", color: T.sub, width: 40, height: 40, borderRadius: 8, flexShrink: 0 }}>×</button>
        </div>
        <p style={{ whiteSpace: "pre-line", fontSize: 13.5, lineHeight: 1.7, color: T.sub }}>{body}</p>
      </div>
    </div>
  );
}

function FooterLink({ children, onClick }) {
  return (
    <button onClick={onClick} style={{ display: "block", background: "none", border: "none", color: T.sub, cursor: "pointer", padding: "3px 0", fontSize: 13, fontFamily: "'Inter', sans-serif", textAlign: "left" }}>
      {children}
    </button>
  );
}

function Footer({ setLegalPage, goHome, openTab, goToCommunity, authToken, onNeedAuth, onOpenFavoris }) {
  return (
    <footer style={{ background: "#080A0F", borderTop: `1px solid ${T.line}`, marginTop: 40 }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "40px 18px 24px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr 1fr 1.3fr", gap: 24 }} className="rp-footer-grid">
          <div>
            <div className="rp-display" style={{ color: T.ink, fontSize: 16, fontWeight: 900, marginBottom: 10 }}>
              RADAR<span style={{ background: T.ember, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>PRIX</span>
            </div>
            <p style={{ fontSize: 12.5, color: T.sub, lineHeight: 1.6, marginBottom: 14, maxWidth: 240 }}>
              RadarPrix détecte automatiquement les meilleurs deals et les erreurs de prix chez les marchands français.
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              {["message", "users", "share", "mail"].map((ic) => (
                <span key={ic} aria-hidden="true" style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, borderRadius: "50%", background: T.surface2, border: `1px solid ${T.line}`, color: T.sub }}>
                  <Icon name={ic} size={15} />
                </span>
              ))}
            </div>
          </div>

          <div>
            <h4 style={{ fontSize: 13, fontWeight: 800, color: T.ink, marginBottom: 8 }}>Navigation</h4>
            <FooterLink onClick={() => openTab("deals")}>Gros deals</FooterLink>
            <FooterLink onClick={() => openTab("erreurs")}>Erreurs de prix</FooterLink>
            <FooterLink onClick={() => (authToken ? onOpenFavoris() : onNeedAuth())}>Favoris</FooterLink>
            <FooterLink onClick={() => goToCommunity("communaute-picks")}>Communauté</FooterLink>
          </div>

          <div>
            <h4 style={{ fontSize: 13, fontWeight: 800, color: T.ink, marginBottom: 8 }}>Légal</h4>
            <FooterLink onClick={() => setLegalPage("mentions")}>Mentions légales</FooterLink>
            <FooterLink onClick={() => setLegalPage("cgu")}>CGU</FooterLink>
            <FooterLink onClick={() => setLegalPage("confidentialite")}>Politique de confidentialité</FooterLink>
          </div>

          <div>
            <h4 style={{ fontSize: 13, fontWeight: 800, color: T.ink, marginBottom: 8 }}>À propos</h4>
            <FooterLink onClick={() => { goHome(); window.scrollTo({ top: document.body.scrollHeight * 0.55, behavior: "smooth" }); }}>Comment ça marche ?</FooterLink>
          </div>

          <div>
            {/* Ce bloc hébergeait un formulaire d'inscription qui n'envoyait
                rien et affichait "pas encore branchée" au clic. Les alertes
                email existent désormais pour de vrai (favoris + prix cible) :
                on renvoie dessus plutôt que de garder un formulaire mort. */}
            <h4 style={{ fontSize: 13, fontWeight: 800, color: T.ink, marginBottom: 8 }}>Restez dans le radar</h4>
            <p style={{ fontSize: 12, color: T.sub, lineHeight: 1.6, marginBottom: 12 }}>
              Suis un produit et reçois un email dès qu'une erreur de prix est repérée, ou dès qu'il passe sous le prix que tu as fixé.
            </p>
            <button
              onClick={() => (authToken ? onOpenFavoris() : onNeedAuth())}
              className="rp-cta"
              style={{
                display: "flex", alignItems: "center", gap: 8,
                background: T.ember, border: "none", borderRadius: 9,
                padding: "10px 16px", color: "#0C0E14", fontSize: 12.5, fontWeight: 900,
                cursor: "pointer", fontFamily: "'Inter', sans-serif",
              }}
            >
              <Icon name="bell" size={14} />
              {authToken ? "Gérer mes alertes" : "Créer mes alertes"}
            </button>
          </div>
        </div>

        <div style={{ borderTop: `1px solid ${T.line}`, marginTop: 28, paddingTop: 18, fontSize: 12, color: "#5A6373", textAlign: "center" }}>
          © 2026 RadarPrix — Scans propulsés par un algorithme maison sur données Google Shopping. RadarPrix n'est affilié à aucun marchand cité.
        </div>
      </div>
    </footer>
  );
}

/* ── App ────────────────────────────────────────────────────── */
/* ── Tableau de bord admin ─────────────────────────────────── */
function AdminDashboard({ token, onBack }) {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState(null);
  const [error, setError] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);

  const load = async () => {
    setError(null);
    try {
      const [s, u] = await Promise.all([apiAdminStats(token), apiAdminUsers(token)]);
      setStats(s);
      setUsers(u);
    } catch (e) {
      setError(e.message);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const triggerScan = async () => {
    setScanning(true);
    setScanResult(null);
    setError(null);
    try {
      const res = await apiAdminTriggerScan(token, 10);
      setScanResult(res);
      await load(); // rafraîchit les stats après le scan
    } catch (e) {
      setError(e.message);
    } finally {
      setScanning(false);
    }
  };

  const cardStyle = { background: T.surface, border: `1px solid ${T.line}`, borderRadius: 14, padding: "18px 20px" };

  return (
    <main style={{ maxWidth: 780, margin: "0 auto", padding: "22px 16px 60px" }}>
      <button onClick={onBack} style={{ background: "none", border: "none", color: T.sub, fontWeight: 700, fontSize: 13, cursor: "pointer", padding: 0, marginBottom: 16, fontFamily: "'Inter', sans-serif" }}>
        ← Retour au site
      </button>
      <h2 className="rp-display" style={{ fontSize: 22, fontWeight: 900, marginBottom: 4, color: T.yellow, display: "flex", alignItems: "center", gap: 9 }}><Icon name="shield" size={21} /> Tableau de bord admin</h2>
      <p style={{ fontSize: 13, color: T.sub, marginBottom: 24 }}>Visible uniquement par toi.</p>

      {error && (
        <div style={{ background: "rgba(255,59,48,0.12)", border: `1.5px solid ${T.red}`, borderRadius: 10, padding: 12, fontSize: 14, color: T.ink, marginBottom: 16 }}>
          {error}
        </div>
      )}

      {!stats && !error && <div style={{ color: T.sub, fontSize: 14 }}>Chargement…</div>}

      {stats && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 20 }}>
            <div style={cardStyle}>
              <div className="rp-display" style={{ fontSize: 28, fontWeight: 900, color: T.ink }}>{stats.totalUsers}</div>
              <div style={{ fontSize: 12, color: T.sub, marginTop: 4 }}>Utilisateurs inscrits</div>
            </div>
            <div style={cardStyle}>
              <div className="rp-display" style={{ fontSize: 28, fontWeight: 900, color: T.ink }}>{stats.totalScans}</div>
              <div style={{ fontSize: 12, color: T.sub, marginTop: 4 }}>Scans enregistrés</div>
            </div>
          </div>

          <div style={{ ...cardStyle, marginBottom: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <h3 style={{ fontSize: 14, fontWeight: 800, color: T.ink }}>Scan manuel</h3>
              <button
                onClick={triggerScan}
                disabled={scanning}
                style={{ padding: "8px 14px", borderRadius: 8, border: "none", background: scanning ? T.surface2 : T.ember, color: scanning ? T.sub : "#0C0E14", fontWeight: 800, fontSize: 12.5, cursor: scanning ? "default" : "pointer", fontFamily: "'Inter', sans-serif" }}
              >
                {scanning ? "Scan en cours…" : "Lancer un scan (10 produits)"}
              </button>
            </div>
            <p style={{ fontSize: 12, color: T.sub, lineHeight: 1.5 }}>
              Consomme du quota SerpApi à chaque clic — à utiliser avec modération, le cron tourne déjà en tâche de fond.
            </p>
            {scanResult && (
              <div style={{ marginTop: 10, fontSize: 12, color: T.green }}>
                ✓ {scanResult.scanned} produit(s) scanné(s) à l'instant.
              </div>
            )}
          </div>

          <div style={{ ...cardStyle, marginBottom: 20 }}>
            <h3 style={{ fontSize: 14, fontWeight: 800, color: T.ink, marginBottom: 12 }}>Produits les plus scannés</h3>
            {stats.topProducts.length === 0 && <p style={{ fontSize: 13, color: T.sub }}>Aucune donnée pour l'instant.</p>}
            {stats.topProducts.map((p) => (
              <div key={p.query} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: `1px solid ${T.line}`, fontSize: 13 }}>
                <span style={{ color: T.ink, textTransform: "capitalize" }}>{p.query}</span>
                <span style={{ color: T.sub }}>{p.times_seen}×</span>
              </div>
            ))}
          </div>

          <div style={cardStyle}>
            <h3 style={{ fontSize: 14, fontWeight: 800, color: T.ink, marginBottom: 12 }}>Utilisateurs ({users?.length || 0})</h3>
            {users?.map((u) => (
              <div key={u.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${T.line}`, fontSize: 13 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                  <Avatar email={u.email} pseudo={u.pseudo} size={22} />
                  <span style={{ color: T.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.pseudo || u.email}</span>
                  {u.role === "admin" && <Icon name="shield" size={11} color={T.yellow} style={{ display: "inline-block" }} />}
                </div>
                <span style={{ color: T.sub, fontSize: 11, flexShrink: 0 }}>{u.created_at?.slice(0, 10)}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </main>
  );
}

/* ── Favoris ────────────────────────────────────────────────── */
// Une ligne de favori : relit le dernier scan enregistré pour cette requête
// suivie (route existante /api/latest, pas de nouvelle route backend) pour
// afficher le vrai prix/score courant, plutôt que juste le nom recherché.
function FavoriteCard({ query, addedAt, targetPrice, authToken, onNeedAuth, onOpenDetail, onOpenSearch }) {
  const [offers, setOffers] = useState(undefined); // undefined = chargement, null = erreur

  useEffect(() => {
    let cancelled = false;
    apiGetLatest(query)
      .then((items) => !cancelled && setOffers(items))
      .catch(() => !cancelled && setOffers(null));
    return () => { cancelled = true; };
  }, [query]);

  if (offers === undefined) return <SkeletonCard />;

  // Aucune anomalie de prix en cours pour ce favori — état neutre, honnête,
  // plutôt qu'une carte de deal vide ou inventée.
  if (!offers || offers.length === 0) {
    return (
      <div className="rp-ticket" style={{ background: T.surface, border: `1.5px solid ${T.line}`, borderRadius: 14, padding: "16px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: 14, color: T.ink }}>{query}</div>
          <div style={{ fontSize: 11.5, color: T.sub, marginTop: 2 }}>
            Suivi depuis le {addedAt?.slice(0, 10)} · aucune anomalie de prix en ce moment
          </div>
          {targetPrice > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11.5, color: T.emberSolid, fontWeight: 700, marginTop: 5 }}>
              <Icon name="bell" size={12} /> Alerte sous {targetPrice} €
            </div>
          )}
        </div>
        <button
          onClick={() => onOpenSearch(query)}
          style={{ padding: "8px 14px", borderRadius: 8, border: `1.5px solid ${T.emberSolid}`, background: "transparent", color: T.ink, fontWeight: 800, fontSize: 12.5, cursor: "pointer", fontFamily: "'Inter', sans-serif", flexShrink: 0 }}
        >
          <Icon name="refresh" size={15} /> Relancer
        </button>
      </div>
    );
  }

  const best = [...offers].sort((a, b) => b.score - a.score)[0];
  return <DealCard item={best} authToken={authToken} onNeedAuth={onNeedAuth} onOpenDetail={onOpenDetail} />;
}

function FavorisView({ token, onBack, onOpenSearch, onOpenDetail, onNeedAuth }) {
  const [items, setItems] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    apiWatchlistGet(token).then(setItems).catch((e) => setError(e.message));
  }, [token]);

  return (
    <PageShell
      icon="star"
      iconColor={T.yellow}
      title="Mes favoris"
      subtitle="Les produits que tu suis. Tu reçois un email dès qu'une erreur de prix est détectée, ou dès que le prix passe sous le seuil que tu as fixé."
      onBack={onBack}
      width={760}
    >
      {error && <p style={{ color: T.red, fontSize: 13, marginBottom: 12 }}>{error}</p>}
      {items && items.length === 0 && (
        <EmptyState
          icon="bell"
          tone={T.yellow}
          title="Aucun produit suivi pour l'instant"
          text="Ouvre la fiche d'un produit et clique sur la cloche pour être prévenu par email. Tu peux aussi fixer un prix cible : « préviens-moi si ça passe sous 400 € »."
          action={
            <button
              onClick={onBack}
              className="rp-cta"
              style={{ marginTop: 4, background: T.ember, border: "none", borderRadius: 10, padding: "11px 20px", color: "#0C0E14", fontSize: 13, fontWeight: 900, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}
            >
              Parcourir les deals
            </button>
          }
        />
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {items?.map((it) => (
          <FavoriteCard
            key={it.query}
            query={it.query}
            addedAt={it.created_at}
            targetPrice={it.target_price}
            authToken={token}
            onNeedAuth={onNeedAuth}
            onOpenDetail={onOpenDetail}
            onOpenSearch={onOpenSearch}
          />
        ))}
      </div>
    </PageShell>
  );
}

/* ── Petits styles partagés entre les vues Communauté / Forum ──── */
const backButtonStyle = { background: "none", border: "none", color: T.sub, fontWeight: 700, fontSize: 13, cursor: "pointer", padding: 0, marginBottom: 16, fontFamily: "'Inter', sans-serif" };
const emberButtonStyle = { padding: "9px 16px", borderRadius: 10, border: "none", background: T.ember, color: "#0C0E14", fontWeight: 900, fontSize: 13, cursor: "pointer", fontFamily: "'Inter', sans-serif", whiteSpace: "nowrap" };
const inputStyle = { padding: "10px 12px", borderRadius: 8, border: `1.5px solid ${T.line}`, background: T.surface2, color: T.ink, fontSize: 13.5, fontFamily: "'Inter', sans-serif", width: "100%" };
function pillTabStyle(active) {
  return { flex: 1, padding: "9px 14px", borderRadius: 7, border: "none", background: active ? T.ember : "transparent", color: active ? "#0C0E14" : T.sub, fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: "'Inter', sans-serif", whiteSpace: "nowrap" };
}
/* ── Communauté : "Choix de la communauté" — deals soumis + votés par les membres ── */
function CommunityPicksView({ token, onBack, onNeedAuth, onGoTo }) {
  const [items, setItems] = useState(null);
  const [error, setError] = useState(null);
  const [sort, setSort] = useState("hot");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", url: "", price: "", category: "tout", seller: "", imageUrl: "", expiresAt: "" });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  const load = async (s) => {
    setError(null);
    try {
      const data = await apiCommunityListDeals(token, "tout", s || sort, 1, 30);
      setItems(data.items);
    } catch (e) {
      setError(e.message);
    }
  };

  useEffect(() => {
    load(sort);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sort]);

  const vote = async (deal, value) => {
    if (!token) {
      onNeedAuth();
      return;
    }
    try {
      const cancelling = deal.myVote === value;
      const updated = cancelling ? await apiCommunityRemoveVote(token, deal.id) : await apiCommunityVote(token, deal.id, value);
      setItems((prev) => prev.map((d) => (d.id === deal.id ? { ...d, ...updated, myVote: cancelling ? null : value } : d)));
    } catch (e) {
      setError(e.message);
    }
  };

  const submit = async () => {
    if (!token) {
      onNeedAuth();
      return;
    }
    if (!form.title.trim()) {
      setFormError("Le titre du deal est requis.");
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      await apiCommunitySubmitDeal(token, {
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        url: form.url.trim() || undefined,
        price: form.price ? Number(form.price) : undefined,
        category: form.category,
        seller: form.seller.trim() || undefined,
        expiresAt: form.expiresAt || undefined,
        imageUrl: form.imageUrl.trim() || undefined,
      });
      setForm({ title: "", description: "", url: "", price: "", category: "tout", seller: "", imageUrl: "", expiresAt: "" });
      setShowForm(false);
      load(sort);
    } catch (e) {
      setFormError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageShell
      icon="trophy"
      iconColor={T.yellow}
      title="Choix de la communauté"
      subtitle="Des deals trouvés et postés par les membres eux-mêmes. Votez pour les plus pertinents : plus un deal reçoit de votes, mieux il est classé."
      onBack={onBack}
      width={860}
      subnav={<CommunityTabs courante="communaute-picks" onNavigate={onGoTo} />}
      action={
        <button onClick={() => (token ? setShowForm((v) => !v) : onNeedAuth())} style={emberButtonStyle}>
          {showForm ? "Annuler" : "+ Proposer un deal"}
        </button>
      }
    >

      {showForm && (
        <div style={{ background: T.surface, border: `1px solid ${T.line}`, borderRadius: 14, padding: 16, marginBottom: 20, display: "flex", flexDirection: "column", gap: 10 }}>
          {formError && <p style={{ color: T.red, fontSize: 12 }}>{formError}</p>}
          <input placeholder="Titre du deal *" value={form.title} maxLength={150} onChange={(e) => setForm({ ...form, title: e.target.value })} style={inputStyle} />
          <textarea
            placeholder="Description (optionnel)"
            value={form.description}
            maxLength={1000}
            rows={3}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            style={{ ...inputStyle, resize: "vertical" }}
          />
          <input placeholder="Lien vers le deal (optionnel)" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} style={inputStyle} />
          <input placeholder="Marchand (optionnel — ex: Amazon)" value={form.seller} onChange={(e) => setForm({ ...form, seller: e.target.value })} style={inputStyle} />
          <input placeholder="Lien de l'image du produit (optionnel)" value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} style={inputStyle} />
          {/* Fin de l'offre : sans elle, un deal reste en tête de liste des
              semaines après avoir expiré, et chaque clic déçoit. */}
          <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12.5, color: T.sub }}>
            <span style={{ whiteSpace: "nowrap" }}>Fin de l'offre (optionnel)</span>
            <input
              type="date"
              value={form.expiresAt}
              min={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
              style={{ ...inputStyle, flex: 1, colorScheme: "dark" }}
            />
          </label>
          <div style={{ display: "flex", gap: 10 }}>
            <input placeholder="Prix € (optionnel)" type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} style={{ ...inputStyle, flex: 1 }} />
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} style={{ ...inputStyle, flex: 1 }}>
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <button onClick={submit} disabled={submitting} style={{ ...emberButtonStyle, opacity: submitting ? 0.6 : 1 }}>
            {submitting ? "Publication…" : "Publier le deal"}
          </button>
        </div>
      )}

      <div style={{ display: "flex", background: T.surface2, borderRadius: 10, padding: 4, marginBottom: 16, width: "fit-content" }}>
        <button onClick={() => setSort("hot")} style={pillTabStyle(sort === "hot")}>
          <Icon name="flame" size={14} /> Pertinents
        </button>
        <button onClick={() => setSort("new")} style={pillTabStyle(sort === "new")}>
          <Icon name="sparkle" size={14} /> Récents
        </button>
      </div>

      {error && <p style={{ color: T.red, fontSize: 12, marginBottom: 10 }}>{error}</p>}
      {items === null && !error && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {[0, 1, 2].map((i) => <div key={i} className="rp-shimmer" style={{ height: 118, borderRadius: 14 }} />)}
        </div>
      )}
      {items?.length === 0 && (
        <EmptyState
          icon="trophy"
          tone={T.yellow}
          title="Aucun deal proposé pour l'instant"
          text="Cette page vit des trouvailles des membres. Tu as repéré une bonne affaire quelque part ? Poste-la, les autres voteront pour la faire remonter."
          action={
            !showForm && (
              <button onClick={() => (token ? setShowForm(true) : onNeedAuth())} style={{ ...emberButtonStyle, marginTop: 4 }}>
                Proposer le premier deal
              </button>
            )
          }
        />
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {items?.map((d, i) => (
          <CommunityDealCard
            key={d.id}
            deal={d}
            index={i}
            onVote={vote}
          />
        ))}
      </div>
    </PageShell>
  );
}

/* ── Communauté : Forum (catégories → sujets) ──────────────────── */
function ForumView({ token, onBack, onOpenThread, onGoTo }) {
  const [categories, setCategories] = useState(null);
  const [error, setError] = useState(null);
  const [activeCategory, setActiveCategory] = useState(null);
  const [threads, setThreads] = useState(null);
  const [showNewThread, setShowNewThread] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newBody, setNewBody] = useState("");
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    apiForumCategories().then(setCategories).catch((e) => setError(e.message));
  }, []);

  const openCategory = async (cat) => {
    setActiveCategory(cat);
    setThreads(null);
    setShowNewThread(false);
    setError(null);
    try {
      const data = await apiForumThreads(cat.slug);
      setThreads(data.items);
    } catch (e) {
      setError(e.message);
    }
  };

  const createThread = async () => {
    if (!token || !activeCategory) return;
    if (!newTitle.trim() || !newBody.trim()) {
      setError("Titre et message sont requis.");
      return;
    }
    setPosting(true);
    setError(null);
    try {
      const thread = await apiForumCreateThread(token, activeCategory.slug, newTitle.trim(), newBody.trim());
      setNewTitle("");
      setNewBody("");
      setShowNewThread(false);
      onOpenThread(thread.id);
    } catch (e) {
      setError(e.message);
    } finally {
      setPosting(false);
    }
  };

  return (
    <PageShell
      icon="folder"
      iconColor={T.purple}
      title={activeCategory ? activeCategory.name : "Forum"}
      subtitle={activeCategory ? undefined : "Questions, conseils et discussions entre membres. Chaque catégorie affiche son dernier sujet actif."}
      onBack={activeCategory ? () => setActiveCategory(null) : onBack}
      backLabel={activeCategory ? "Catégories" : "Accueil"}
      width={820}
      subnav={<CommunityTabs courante="communaute-forum" onNavigate={onGoTo} />}
      action={
        activeCategory && (
          <button onClick={() => setShowNewThread((v) => !v)} style={emberButtonStyle}>
            {showNewThread ? "Annuler" : "+ Nouveau sujet"}
          </button>
        )
      }
    >

      {!activeCategory && (
        <>
          {error && <p style={{ color: T.red, fontSize: 12, marginBottom: 10 }}>{error}</p>}
          {categories === null && !error && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[0, 1, 2].map((i) => <div key={i} className="rp-shimmer" style={{ height: 108, borderRadius: 14 }} />)}
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {categories?.map((c, i) => (
              <Tilt3D key={c.id} max={5} lift={8}>
                <button
                  onClick={() => openCategory(c)}
                  className="fade-up rp-forum-card"
                  style={{
                    width: "100%", textAlign: "left", background: T.gradSurface,
                    border: `1px solid ${T.line}`, borderRadius: T.radiusLg, padding: "18px 20px",
                    cursor: "pointer", boxShadow: T.shadowCard, animationDelay: `${i * 70}ms`,
                    fontFamily: "'Inter', system-ui, sans-serif",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                      <span
                        aria-hidden="true"
                        style={{
                          display: "flex", alignItems: "center", justifyContent: "center",
                          width: 40, height: 40, borderRadius: 11, flexShrink: 0,
                          background: "rgba(139,92,246,.14)", border: `1px solid ${T.purple}3a`,
                        }}
                      >
                        <Icon name="folder" size={19} color={T.purple} />
                      </span>
                      <div style={{ minWidth: 0 }}>
                        <h3 style={{ fontSize: 15.5, fontWeight: 800, color: T.ink }}>{c.name}</h3>
                        {c.description && <p style={{ fontSize: 12.5, color: T.sub, marginTop: 3, lineHeight: 1.5 }}>{c.description}</p>}
                      </div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0, fontSize: 11.5, color: T.sub, fontWeight: 700, lineHeight: 1.6 }}>
                      <div>{c.thread_count} sujet{c.thread_count > 1 ? "s" : ""}</div>
                      <div style={{ color: T.muted }}>{c.reply_count || 0} réponse{c.reply_count > 1 ? "s" : ""}</div>
                    </div>
                  </div>

                  {/* Dernière activité : sans elle, impossible de savoir si
                      quelqu'un écrit encore dans cette catégorie. */}
                  <div style={{ borderTop: `1px solid ${T.line}`, marginTop: 14, paddingTop: 11, fontSize: 11.5, color: T.sub, display: "flex", alignItems: "center", gap: 7 }}>
                    {c.last_title ? (
                      <>
                        <span className="rp-fresh-dot" aria-hidden="true" />
                        <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          <strong style={{ color: T.ink, fontWeight: 700 }}>{c.last_title}</strong>
                          {" · "}{c.last_author}{" · "}{relativeTime(c.last_activity_at) || c.last_activity_at?.slice(0, 10)}
                        </span>
                      </>
                    ) : (
                      <span style={{ color: T.muted }}>Aucun sujet pour l'instant — sois le premier à écrire.</span>
                    )}
                  </div>
                </button>
              </Tilt3D>
            ))}
          </div>
        </>
      )}

      {activeCategory && (
        <>
          {error && <p style={{ color: T.red, fontSize: 12, marginBottom: 10 }}>{error}</p>}
          {showNewThread && (
            <div style={{ background: T.surface, border: `1px solid ${T.line}`, borderRadius: 14, padding: 16, marginBottom: 20, display: "flex", flexDirection: "column", gap: 10 }}>
              <input placeholder="Titre du sujet" value={newTitle} maxLength={150} onChange={(e) => setNewTitle(e.target.value)} style={inputStyle} />
              <textarea placeholder="Votre message…" value={newBody} maxLength={5000} rows={4} onChange={(e) => setNewBody(e.target.value)} style={{ ...inputStyle, resize: "vertical" }} />
              <button onClick={createThread} disabled={posting} style={{ ...emberButtonStyle, opacity: posting ? 0.6 : 1 }}>
                {posting ? "Publication…" : "Publier le sujet"}
              </button>
            </div>
          )}
          {threads === null && !error && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[0, 1].map((i) => <div key={i} className="rp-shimmer" style={{ height: 62, borderRadius: 12 }} />)}
            </div>
          )}
          {threads?.length === 0 && (
            <EmptyState
              icon="message"
              tone={T.purple}
              title="Personne n'a encore écrit ici"
              text="Cette catégorie attend son premier sujet. Une question, un retour d'expérience, un bon plan à détailler — tout est bienvenu."
              action={
                !showNewThread && (
                  <button onClick={() => setShowNewThread(true)} style={{ ...emberButtonStyle, marginTop: 4 }}>
                    Lancer la discussion
                  </button>
                )
              }
            />
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {threads?.map((t) => (
              <button
                key={t.id}
                onClick={() => onOpenThread(t.id)}
                style={{ textAlign: "left", background: T.surface, border: `1px solid ${T.line}`, borderRadius: 12, padding: "12px 14px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: 14, color: T.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.title}</div>
                  <div style={{ fontSize: 11.5, color: T.sub, marginTop: 2 }}>
                    {t.author} · {t.last_activity_at?.slice(0, 10)}
                  </div>
                </div>
                <span style={{ fontSize: 12, color: T.sub, fontWeight: 800, flexShrink: 0 }}><span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>{t.reply_count} <Icon name="message" size={12} /></span></span>
              </button>
            ))}
          </div>
        </>
      )}
    </PageShell>
  );
}

/* ── Communauté : Forum — détail d'un sujet + réponses ─────────── */
function ThreadDetailView({ threadId, token, currentUserId, onBack }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    setData(null);
    setError(null);
    apiForumThread(threadId).then(setData).catch((e) => setError(e.message));
  }, [threadId]);

  const reply = async () => {
    if (!token || !replyText.trim()) return;
    setPosting(true);
    setError(null);
    try {
      const replies = await apiForumReply(token, threadId, replyText.trim());
      setData((prev) => ({ ...prev, replies }));
      setReplyText("");
    } catch (e) {
      setError(e.message);
    } finally {
      setPosting(false);
    }
  };

  if (!data) {
    return (
      <main style={{ maxWidth: 680, margin: "0 auto", padding: "22px 16px 60px" }}>
        <button onClick={onBack} style={backButtonStyle}>← Retour</button>
        {error ? <p style={{ color: T.red, fontSize: 13 }}>{error}</p> : <p style={{ color: T.sub, fontSize: 13 }}>Chargement…</p>}
      </main>
    );
  }

  const { thread, replies } = data;
  return (
    <main style={{ maxWidth: 680, margin: "0 auto", padding: "22px 16px 60px" }}>
      <button onClick={onBack} style={backButtonStyle}>← {thread.category_name}</button>
      <h2 className="rp-display" style={{ fontSize: 19, fontWeight: 900, marginBottom: 12 }}>{thread.title}</h2>
      <div style={{ background: T.surface, border: `1px solid ${T.line}`, borderRadius: 14, padding: 16, marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <AuthorLink
            userId={thread.user_id}
            nom={thread.author}
            avatarUrl={thread.avatar_url}
            taille={26}
            tailleNom={13}
            enColonne
            meta={relativeTime(thread.created_at)}
          />
        </div>
        <p style={{ fontSize: 14, color: T.ink, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{thread.body}</p>
      </div>

      <h3 style={{ fontSize: 13, color: T.sub, fontWeight: 800, marginBottom: 10 }}>
        {replies.length} réponse{replies.length > 1 ? "s" : ""}
      </h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
        {replies.map((r) => (
          <div key={r.id} style={{ minWidth: 0, background: T.surface2, borderRadius: 10, padding: "10px 12px" }}>
            <AuthorLink
              userId={r.user_id}
              nom={r.author}
              avatarUrl={r.avatar_url}
              taille={24}
              couleurNom={r.user_id === currentUserId ? T.emberSolid : T.ink}
              meta={relativeTime(r.created_at)}
            />
            <div style={{ fontSize: 13.5, color: T.ink, whiteSpace: "pre-wrap", paddingLeft: 32, marginTop: 3, lineHeight: 1.55 }}>{r.body}</div>
          </div>
        ))}
      </div>

      {error && <p style={{ color: T.red, fontSize: 12, marginBottom: 10 }}>{error}</p>}
      {token ? (
        <div style={{ display: "flex", gap: 6 }}>
          <input
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && reply()}
            maxLength={5000}
            placeholder="Votre réponse…"
            style={{ flex: 1, padding: "10px 12px", borderRadius: 8, border: `1.5px solid ${T.line}`, background: T.surface2, color: T.ink, fontSize: 13.5, fontFamily: "'Inter', sans-serif" }}
          />
          <button
            onClick={reply}
            disabled={posting}
            style={{ padding: "0 16px", borderRadius: 8, border: "none", background: T.ember, color: "#0C0E14", fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: "'Inter', sans-serif", opacity: posting ? 0.6 : 1 }}
          >
            Répondre
          </button>
        </div>
      ) : (
        <p style={{ color: T.sub, fontSize: 13 }}>Connectez-vous pour répondre à ce sujet.</p>
      )}
    </main>
  );
}

export default function RadarPrixSite() {
  const [view, setView] = useState("home");
  const [legalPage, setLegalPage] = useState(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [communityMenuOpen, setCommunityMenuOpen] = useState(false);
  const [activeThreadId, setActiveThreadId] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [authToken, setAuthToken] = useState(null);
  const [authUser, setAuthUser] = useState(null); // { id, email, role, pseudo, avatar_url }
  const [followMsg, setFollowMsg] = useState(null);
  const [dealDetailItem, setDealDetailItem] = useState(null);
  const [marchandActif, setMarchandActif] = useState(null); // page marchand ouverte
  const [membreActif, setMembreActif] = useState(null); // profil de membre ouvert (pseudo ou id)
  const [chatCible, setChatCible] = useState(null); // membre à qui écrire, depuis son profil
  const [onboarding, setOnboarding] = useState(false); // réglages à faire juste après l'inscription

  // Ouvre une des trois sous-pages du menu "Communauté" (connexion requise, comme le reste de l'espace membre).
  const goToCommunity = (targetView) => {
    setCommunityMenuOpen(false);
    if (!authToken) {
      setAuthOpen(true);
      return;
    }
    setView(targetView);
    window.scrollTo(0, 0);
  };

  // Ouvre la fiche produit détaillée d'un deal (cliqué depuis une DealCard).
  // L'URL suit automatiquement (voir la synchronisation plus bas).
  const openDealDetail = (item) => {
    setDealDetailItem(item);
    setView("dealDetail");
    window.scrollTo(0, 0);
  };

  // Ouvre le profil public d'un membre. Accepte un pseudo (adresse lisible)
  // ou un identifiant numérique — le backend résout les deux, ce qui évite de
  // casser un lien partagé quand quelqu'un change de pseudo.
  const openProfile = (handle) => {
    if (!handle) return;
    setMembreActif(String(handle));
    setView("membre");
    window.scrollTo(0, 0);
  };

  // Ouvre la page dédiée d'un marchand (nom cliquable sur la fiche produit).
  const openMerchant = (nom) => {
    if (!nom) return;
    setMarchandActif(nom);
    setView("marchand");
    window.scrollTo(0, 0);
  };

  useEffect(() => {
    const t = localStorage.getItem("radarprix_token");
    const u = localStorage.getItem("radarprix_user");
    if (t && u) {
      setAuthToken(t);
      try {
        setAuthUser(JSON.parse(u));
      } catch {}
    }
  }, []);


  const persistUser = (user) => {
    setAuthUser(user);
    localStorage.setItem("radarprix_user", JSON.stringify(user));
  };

  const logout = () => {
    localStorage.removeItem("radarprix_token");
    localStorage.removeItem("radarprix_user");
    localStorage.removeItem("radarprix_email"); // nettoyage des anciennes clés
    localStorage.removeItem("radarprix_role");
    setAuthToken(null);
    setAuthUser(null);
    setProfileMenuOpen(false);
  };

  // Session expirée : le jeton JWT a une durée de vie limitée. Sans ça,
  // l'interface continuait d'afficher le membre comme connecté et chaque
  // action échouait avec un message technique incompréhensible.
  const [sessionExpiree, setSessionExpiree] = useState(false);
  useEffect(() => {
    setUnauthorizedHandler(() => {
      logout();
      setSessionExpiree(true);
      setView((v) => (["favoris", "admin", ...COMMUNITY_VIEWS].includes(v) ? "home" : v));
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  // Rend les pseudos cliquables partout : commentaires, salon, forum, deals
  // communautaires. Voir routes.js pour le détail du procédé.
  useEffect(() => {
    setProfileNavigator(openProfile);
    return () => setProfileNavigator(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const authRole = authUser?.role || null;

  const followCurrentSearch = async () => {
    if (!authToken) {
      setAuthOpen(true);
      return;
    }
    const followQuery = searchTerm || `Catégorie : ${CATEGORIES.find((c) => c.id === category)?.label || category}`;
    try {
      await apiWatchlistAdd(authToken, followQuery, category);
      setFollowMsg("✓ Ajouté à tes favoris");
      setTimeout(() => setFollowMsg(null), 2500);
    } catch (e) {
      setFollowMsg("Erreur : " + e.message);
      setTimeout(() => setFollowMsg(null), 3000);
    }
  };

  const [tab, setTab] = useState("deals"); // deals | erreurs
  const [searchTerm, setSearchTerm] = useState("");

  /* ── Synchronisation avec l'URL ────────────────────────────────
     Jusqu'ici seule l'accueil avait une adresse : le bouton retour du
     navigateur ne faisait rien d'utile, aucune page ne pouvait être mise en
     favori ou partagée, et rien n'était indexable. La traduction état <->
     chemin vit dans routes.js. ─────────────────────────────────────── */

  // Recharge la fiche produit désignée par l'URL. Relit un scan déjà
  // enregistré (apiGetLatest, gratuit) plutôt que d'en relancer un payant
  // juste parce qu'un lien a été ouvert.
  const ouvrirProduitDepuisUrl = (nom) => {
    apiGetLatest(nom)
      .then((items) => {
        if (items.length > 0) openDealDetail(items.find((i) => i.name === nom) || items[0]);
      })
      .catch(() => {});
  };

  // Applique l'état décrit par l'URL courante (au chargement et sur "retour").
  const appliquerUrl = () => {
    const { search, pathname } = window.location;

    // Ancien format de lien (?produit=Nom) : les liens déjà partagés avant
    // l'introduction des chemins doivent continuer de fonctionner.
    const ancien = legacyProductParam(search);
    if (ancien) {
      ouvrirProduitDepuisUrl(ancien);
      return;
    }

    const etat = pathToState(pathname, search);
    if (etat.view === "dealDetail") {
      ouvrirProduitDepuisUrl(etat.produit);
      return;
    }
    if (etat.view === "marchand") setMarchandActif(etat.marchand);
    if (etat.view === "membre") setMembreActif(etat.membre);
    if (etat.view === "communaute-forum-thread") setActiveThreadId(etat.threadId);
    if (etat.tab) setTab(etat.tab);
    setSearchTerm(etat.searchTerm || null);
    setView(etat.view);
  };

  useEffect(() => {
    appliquerUrl();
    window.addEventListener("popstate", appliquerUrl);
    return () => window.removeEventListener("popstate", appliquerUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Écrit l'URL correspondant à l'état courant. pushState (et non replace) :
  // c'est ce qui donne un vrai historique de navigation au bouton retour.
  useEffect(() => {
    const chemin = stateToPath({
      view,
      tab,
      searchTerm,
      produit: dealDetailItem?.name,
      threadId: activeThreadId,
      marchand: marchandActif,
      membre: membreActif,
    });
    const actuel = window.location.pathname + window.location.search;
    if (chemin !== actuel) window.history.pushState(null, "", chemin);
  }, [view, tab, searchTerm, dealDetailItem, activeThreadId, marchandActif, membreActif]);
  const [category, setCategory] = useState("tout");
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [items, setItems] = useState(null);
  const [error, setError] = useState(null);
  const [lastScan, setLastScan] = useState(null);
  const [verdictFilter, setVerdictFilter] = useState("all");
  const [sortBy, setSortBy] = useState("score");
  const [maxPrice, setMaxPrice] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [sellerFilter, setSellerFilter] = useState("tous");
  const [scannedQuery, setScannedQuery] = useState(null);
  const [totalDeals, setTotalDeals] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 15;

  // Arriver sur /deals ou /erreurs par l'URL (lien direct, favori, bouton
  // retour) ne passe pas par openTab(), qui est ce qui déclenche la requête :
  // sans cet effet, la liste restait vide.
  useEffect(() => {
    if (view !== "results" || searchTerm || items !== null || loading) return;
    let annule = false;
    setLoading(true);
    setError(null);
    fetchDeals(category, 1, PAGE_SIZE)
      .then((data) => {
        if (annule) return;
        setItems(data.items);
        setTotalDeals(data.total);
        setHasMore(data.hasMore);
        setLastScan(new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }));
      })
      .catch((e) => !annule && setError("Impossible de charger les deals : " + e.message))
      .finally(() => !annule && setLoading(false));
    return () => { annule = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, searchTerm, items]);


  useEffect(() => {
    document.title = "RadarPrix — Le détecteur d'erreurs de prix";
  }, []);

  // Onglets "Gros deals" / "Erreurs de prix" : lecture instantanée du pool
  // de deals déjà repérés en base par le cron — pas de scan à la volée,
  // pas de limite arbitraire, juste de la pagination.
  const openTab = async (newTab, opts = {}) => {
    const catId = opts.category !== undefined ? opts.category : category;
    setTab(newTab);
    setSearchTerm("");
    setVerdictFilter(newTab === "erreurs" ? "erreur" : "all");
    setView("results");
    window.scrollTo(0, 0);
    setLoading(true);
    setError(null);
    setItems(null);
    setPage(1);
    try {
      const data = await fetchDeals(catId, 1, PAGE_SIZE);
      setItems(data.items);
      setTotalDeals(data.total);
      setHasMore(data.hasMore);
      setLastScan(new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }));
    } catch (e) {
      console.error(e);
      setError("Impossible de charger les deals : " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const loadMoreDeals = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    setError(null);
    try {
      const nextPage = page + 1;
      const data = await fetchDeals(category, nextPage, PAGE_SIZE);
      setItems([...(items || []), ...data.items]);
      setHasMore(data.hasMore);
      setPage(nextPage);
    } catch (e) {
      setError("Impossible de charger la suite : " + e.message);
    } finally {
      setLoadingMore(false);
    }
  };

  // Recherche libre (barre de recherche). Deux étapes :
  // 1) D'abord parcourir les deals déjà détectés par le cron qui matchent ce
  //    mot-clé (instantané, gratuit, et fiable même sur un terme large comme
  //    "pc" — chaque deal a déjà été comparé à ses propres pairs/historique,
  //    jamais à un autre produit).
  // 2) Si rien ne matche, lancer un vrai scan SerpApi en direct sur ce terme
  //    précis — pertinent pour un produit spécifique pas encore au catalogue.
  const searchProduct = async (term) => {
    setTab("deals");
    setSearchTerm(term);
    setVerdictFilter("all");
    setView("results");
    window.scrollTo(0, 0);
    setLoading(true);
    setError(null);
    setItems(null);
    setScannedQuery(null);
    setLastScan(null);
    try {
      const catalogMatch = await fetchDeals("tout", 1, 30, term);
      if (catalogMatch.items.length > 0) {
        setItems(catalogMatch.items);
        setScannedQuery(term);
        setHasMore(false);
        return;
      }
      const { items: found, scannedQuery: sq } = await scanBackend(term, "tout");
      setItems(found);
      setScannedQuery(sq);
      setHasMore(false);
      setLastScan(new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }));
    } catch (e) {
      console.error(e);
      setError("Le scan a échoué : " + e.message);
    } finally {
      setLoading(false);
    }
  };

  // Marchands réellement présents dans les résultats courants : la liste
  // est construite à partir des données, jamais d'une liste figée qui
  // proposerait des vendeurs sans aucune offre.
  const sellersDisponibles = [...new Set((items || []).map((it) => it.seller).filter(Boolean))].sort();

  const visible = (items || [])
    .filter((it) => {
      if (verdictFilter !== "all" && it.verdict !== verdictFilter) return false;
      if (minPrice && Number(it.price) < Number(minPrice)) return false;
      if (maxPrice && Number(it.price) > Number(maxPrice)) return false;
      if (sellerFilter !== "tous" && it.seller !== sellerFilter) return false;
      return true;
    })
    .sort((a, b) => (sortBy === "prix" ? Number(a.price) - Number(b.price) : b.score - a.score));

  const filtresActifs = (verdictFilter !== "all") + Boolean(minPrice) + Boolean(maxPrice) + (sellerFilter !== "tous");
  const reinitialiserFiltres = () => {
    setVerdictFilter("all");
    setMinPrice("");
    setMaxPrice("");
    setSellerFilter("tous");
  };

  const goHome = () => {
    setView("home");
    window.scrollTo(0, 0);
    window.history.replaceState(null, "", window.location.pathname);
  };

  // Flux de deals de la page d'accueil, chargé une seule fois et partagé par
  // les trois sections qui l'utilisent (chiffres clés, erreurs, pépites).
  const homeFeed = useHomeFeed();

  // Détermine l'onglet actif dans MobileNav à partir de l'état de navigation existant.
  const mobileNavActive =
    COMMUNITY_VIEWS.includes(view) ? "communaute" :
    view === "favoris" ? "favoris" :
    view === "results" && tab === "erreurs" ? "erreurs" :
    view === "results" ? "deals" :
    view === "home" ? "home" :
    null;

  const handleMobileNav = (key) => {
    if (key === "home") return goHome();
    if (key === "deals") return openTab("deals");
    if (key === "erreurs") return openTab("erreurs");
    if (key === "favoris") {
      if (!authToken) return setAuthOpen(true);
      setView("favoris");
      window.scrollTo(0, 0);
      return;
    }
    // La communauté remplace l'ancien onglet "Profil" : le profil est déjà
    // accessible via l'avatar en haut à droite, et son menu s'ouvrait là-haut
    // alors qu'on venait d'appuyer en bas de l'écran — geste déroutant.
    if (key === "communaute") return goToCommunity("communaute-picks");
  };

  return (
    <div
      className="rp-body"
      onClick={() => {
        if (profileMenuOpen) setProfileMenuOpen(false);
        if (communityMenuOpen) setCommunityMenuOpen(false);
      }}
      style={{ background: T.bg, color: T.ink, minHeight: "100vh", display: "flex", flexDirection: "column" }}
    >
      <GlobalStyles />

      {/* Session expirée : message clair et action évidente, au lieu de
          laisser le membre buter sur des erreurs techniques. */}
      {sessionExpiree && (
        <div
          role="status"
          className="toast-in"
          style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 12, flexWrap: "wrap",
            background: "rgba(255,197,61,.10)", borderBottom: `1px solid ${T.yellow}55`,
            padding: "11px 16px", fontSize: 13, color: T.ink,
          }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Icon name="lock" size={15} color={T.yellow} />
            Ta session a expiré — reconnecte-toi pour retrouver tes favoris et alertes.
          </span>
          <button
            onClick={() => { setSessionExpiree(false); setAuthOpen(true); }}
            className="rp-cta"
            style={{ background: T.ember, border: "none", borderRadius: 8, padding: "7px 15px", color: "#0C0E14", fontSize: 12.5, fontWeight: 900, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}
          >
            Se reconnecter
          </button>
          <button
            onClick={() => setSessionExpiree(false)}
            aria-label="Masquer ce message"
            style={{ background: "none", border: "none", color: T.sub, fontSize: 16, lineHeight: 1, cursor: "pointer", padding: 4 }}
          >
            ×
          </button>
        </div>
      )}

      <nav style={{ position: "sticky", top: 0, zIndex: 50, background: "rgba(12,14,20,0.92)", backdropFilter: "blur(10px)", borderBottom: `1px solid ${T.line}` }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 16px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 54, minWidth: 0 }}>
            <button onClick={goHome} className="rp-display" style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 16, fontWeight: 900, color: T.ink, background: "none", border: "none", cursor: "pointer", padding: 0 }}>
              <img src="/design-system/01_LOGOS/logo_icon_radar.svg" alt="" aria-hidden="true" width={26} height={26} style={{ flexShrink: 0 }} />
              RADAR<span style={{ background: T.ember, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>PRIX</span>
            </button>
            {/* Sur mobile cette barre s'écrasait à quelques pixels de large (boîte
                vide inutilisable) : la recherche y est masquée et reste accessible
                via le champ pleine largeur affiché sous le titre de la page. */}
            {view === "results" && (
              <div className="rp-nav-search" style={{ flex: "1 1 140px", minWidth: 0, maxWidth: 340, marginLeft: 14 }}>
                <SearchBar onSearch={(t) => searchProduct(t)} />
              </div>
            )}
            {authToken && authUser ? (
              <div style={{ position: "relative", marginLeft: 12 }}>
                <button
                  onClick={() => setProfileMenuOpen((v) => !v)}
                  aria-label="Menu du profil"
                  style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: `1.5px solid ${authRole === "admin" ? T.yellow : T.line}`, borderRadius: 20, padding: "4px 10px 4px 4px", cursor: "pointer" }}
                >
                  <Avatar email={authUser.email} pseudo={authUser.pseudo} avatarUrl={authUser.avatar_url} size={26} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: authRole === "admin" ? T.yellow : T.sub, maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {authUser.pseudo || authUser.email}
                  </span>
                </button>
                {profileMenuOpen && (
                  <ProfileMenu
                    user={authUser}
                    role={authRole}
                    onOpenProfile={() => { openProfile(authUser.pseudo || authUser.id); setProfileMenuOpen(false); }}
                    onOpenSettings={() => { setSettingsOpen(true); setProfileMenuOpen(false); }}
                    onLogout={logout}
                    onOpenAdmin={() => { setView("admin"); setProfileMenuOpen(false); }}
                  />
                )}
              </div>
            ) : (
              <button
                onClick={() => setAuthOpen(true)}
                style={{ marginLeft: 12, background: "none", border: `1.5px solid ${T.line}`, borderRadius: 8, padding: "6px 12px", color: T.sub, fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", fontFamily: "'Inter', sans-serif" }}
              >
                Connexion
              </button>
            )}
          </div>
          {/* overflowX: "visible" (pas "auto") : un axe non-"visible" forcerait l'autre à "auto" en CSS,
              ce qui découperait le menu déroulant "Communauté" qui dépasse verticalement sous la barre. */}
          <div className="rp-nav-tabs" style={{ display: "flex", gap: 6, flexWrap: "wrap", overflowX: "visible", paddingBottom: 6 }}>
            <button className={`rp-tab ${view === "results" && tab === "deals" ? "active" : ""}`} onClick={() => openTab("deals")}>
              <Icon name="flame" size={15} /> Gros deals
            </button>
            <button className={`rp-tab ${view === "results" && tab === "erreurs" ? "active" : ""}`} onClick={() => openTab("erreurs")}>
              <Icon name="alertCircle" size={15} /> Erreurs de prix
            </button>
            <button className={`rp-tab ${view === "favoris" ? "active" : ""}`} onClick={() => (authToken ? setView("favoris") : setAuthOpen(true))}>
              <Icon name="star" size={15} /> Favoris
            </button>
            <div className="rp-dropdown-wrap" onMouseEnter={() => setCommunityMenuOpen(true)} onMouseLeave={() => setCommunityMenuOpen(false)}>
              <button
                className={`rp-tab ${COMMUNITY_VIEWS.includes(view) ? "active" : ""}`}
                aria-haspopup="true"
                aria-expanded={communityMenuOpen}
                onClick={(e) => {
                  // Ne bascule pas (toggle) : un survol suivi d'un clic (souris) doit laisser le
                  // menu ouvert, pas le refermer aussitôt. Un clic répété (tactile) le rouvre simplement ;
                  // il se referme via onMouseLeave ou un clic à l'extérieur (voir le onClick racine).
                  e.stopPropagation();
                  setCommunityMenuOpen(true);
                }}
              >
                <Icon name="users" size={15} /> Communauté <span style={{ fontSize: 9 }}>▾</span>
              </button>
              {communityMenuOpen && (
                <div className="rp-dropdown" role="menu" onClick={(e) => e.stopPropagation()}>
                  <button className="rp-dropdown-item" role="menuitem" onClick={() => goToCommunity("communaute-picks")}>
                    <Icon name="trophy" size={16} color={T.yellow} />
                    <span>
                      Choix de la communauté
                      <span className="rp-dropdown-desc">Deals postés et votés par les membres</span>
                    </span>
                  </button>
                  <button className="rp-dropdown-item" role="menuitem" onClick={() => goToCommunity("communaute-chat")}>
                    <Icon name="message" size={16} color={T.cyan} />
                    <span>
                      Chat
                      <span className="rp-dropdown-desc">Salon général et messages privés</span>
                    </span>
                  </button>
                  <button className="rp-dropdown-item" role="menuitem" onClick={() => goToCommunity("communaute-forum")}>
                    <Icon name="folder" size={16} color={T.purple} />
                    <span>
                      Forum
                      <span className="rp-dropdown-desc">Sujets par catégorie, avec réponses</span>
                    </span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      <div style={{ flex: 1 }}>
        {view === "home" && (
          <>
            <header style={{ position: "relative", overflow: "hidden", borderBottom: `1px solid ${T.line}` }}>
              {/* Nappes de couleur diffuses, en fond de scène */}
              <div className="rp-aurora" aria-hidden="true">
                <span style={{ top: "-22%", left: "8%", width: 480, height: 420, background: "rgba(255,106,26,.30)" }} />
                <span style={{ top: "6%", right: "4%", width: 420, height: 380, background: "rgba(139,92,246,.24)", animationDelay: "-7s" }} />
                <span style={{ bottom: "-28%", left: "34%", width: 520, height: 340, background: "rgba(255,52,93,.16)", animationDelay: "-13s" }} />
              </div>

              <Hero3D />

              <div className="rp-hero-inner" style={{ position: "relative", zIndex: 1, maxWidth: 960, margin: "0 auto", padding: "86px 18px 74px", textAlign: "center" }}>
                <span
                  className="fade-up"
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 8,
                    background: "rgba(13,20,34,.72)", backdropFilter: "blur(10px)",
                    border: `1px solid ${T.line}`, borderRadius: 999,
                    padding: "7px 15px", fontSize: 12, fontWeight: 700, color: T.sub,
                    marginBottom: 22,
                  }}
                >
                  <span className="rp-fresh-dot" aria-hidden="true" />
                  Détection active en continu
                </span>

                <h1
                  className="rp-display fade-up"
                  style={{ fontSize: "clamp(30px, 6.6vw, 58px)", fontWeight: 900, lineHeight: 1.08, letterSpacing: "-0.02em", animationDelay: "60ms" }}
                >
                  Quand le marchand se trompe,
                  <br />
                  <span style={{ background: T.ember, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>vous gagnez.</span>
                </h1>

                <p className="fade-up" style={{ maxWidth: 540, margin: "20px auto 32px", color: T.sub, fontSize: "clamp(14px, 1.6vw, 16.5px)", lineHeight: 1.65, animationDelay: "120ms" }}>
                  Erreurs de prix et très gros deals, détectés par un algorithme qui compare en continu les prix réels des marchands français.
                </p>

                <div className="fade-up" style={{ maxWidth: 540, margin: "0 auto", animationDelay: "180ms" }}>
                  <SearchBar big onSearch={(t) => searchProduct(t)} placeholder="Rechercher un produit : PS5, aspirateur, iPhone..." />
                </div>

                {/* Bandeau marchands défilant */}
                <div className="fade-up" style={{ marginTop: 40, animationDelay: "240ms" }}>
                  <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: "0.14em", color: T.muted, textTransform: "uppercase", marginBottom: 13 }}>
                    Prix comparés chez
                  </div>
                  <div className="rp-marquee" aria-hidden="true">
                    {[0, 1].map((copy) => (
                      <div className="rp-marquee-track" key={copy}>
                        {FEATURED_MERCHANTS.concat(FEATURED_MERCHANTS).map((m, i) => (
                          <span
                            key={`${copy}-${m}-${i}`}
                            style={{
                              flexShrink: 0,
                              background: "rgba(13,20,34,.6)", border: `1px solid ${T.line}`,
                              borderRadius: 10, padding: "9px 17px",
                              fontSize: 12.5, fontWeight: 800, color: T.sub, whiteSpace: "nowrap",
                            }}
                          >
                            {m}
                          </span>
                        ))}
                      </div>
                    ))}
                  </div>
                  <span style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>
                    Marchands suivis : {FEATURED_MERCHANTS.join(", ")}.
                  </span>
                </div>
              </div>
            </header>

            <HomeStatsBar feed={homeFeed} />

            {/* Les erreurs de prix passent AVANT les pépites : c'est la
                promesse principale du site (et son nom), elle ne peut pas
                être reléguée sous les deals classiques. */}
            <HomeErrorsSection
              feed={homeFeed}
              authToken={authToken}
              onNeedAuth={() => setAuthOpen(true)}
              onSeeAll={() => openTab("erreurs")}
              onOpenDetail={openDealDetail}
              onNeedAlert={() => (authToken ? setView("favoris") : setAuthOpen(true))}
            />

            <HomeDealsSection
              feed={homeFeed}
              authToken={authToken}
              onNeedAuth={() => setAuthOpen(true)}
              onSeeAll={() => openTab("deals")}
              onOpenDetail={openDealDetail}
              onSearch={() => document.querySelector("header input")?.focus()}
            />

            <section style={{ position: "relative", overflow: "hidden", background: T.surface, borderTop: `1px solid ${T.line}`, borderBottom: `1px solid ${T.line}`, marginTop: 56 }}>
              <div className="rp-aurora" aria-hidden="true" style={{ opacity: 0.5 }}>
                <span style={{ top: "-40%", left: "18%", width: 460, height: 400, background: "rgba(139,92,246,.20)" }} />
                <span style={{ bottom: "-46%", right: "12%", width: 430, height: 380, background: "rgba(255,106,26,.18)", animationDelay: "-9s" }} />
              </div>

              <div style={{ position: "relative", zIndex: 1, maxWidth: 1200, margin: "0 auto", padding: "68px 18px 72px" }}>
                <h2 className="rp-display" style={{ fontSize: "clamp(21px, 3.2vw, 30px)", fontWeight: 900, textAlign: "center", letterSpacing: "-0.01em" }}>
                  Comment ça marche
                </h2>
                <p style={{ textAlign: "center", color: T.sub, fontSize: 14.5, maxWidth: 480, margin: "12px auto 44px", lineHeight: 1.6 }}>
                  Quatre étapes, entièrement automatisées, entre le prix affiché par le marchand et l'alerte que vous recevez.
                </p>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(228px, 1fr))", gap: 18, maxWidth: 1080, margin: "0 auto" }}>
                  {[
                    { n: 1, icon: "radar", iconBg: "#181B39", accent: T.purple, title: "Scan en continu", text: "Nos robots interrogent en temps réel les prix chez des milliers de marchands français." },
                    { n: 2, icon: "scale", iconBg: "#332818", accent: T.yellow, title: "Analyse intelligente", text: "Un algorithme compare chaque prix à l'historique déjà observé et à la médiane du marché." },
                    { n: 3, icon: "alertTriangle", iconBg: "#2C1420", accent: T.pink, title: "Détection d'anomalies", text: "Les bons plans et les erreurs de prix sont repérés et notés automatiquement sur 100." },
                    { n: 4, icon: "bell", iconBg: "#2E2318", accent: T.emberSolid, title: "Vous en profitez", text: "Consultez les deals et erreurs détectés, suivez vos recherches, foncez avant tout le monde." },
                  ].map((s, i) => (
                    <Reveal key={s.title} depth delay={i * 90}>
                      <Tilt3D max={12} lift={16} style={{ height: "100%" }}>
                        <div
                          style={{
                            position: "relative",
                            height: "100%",
                            background: T.gradSurface,
                            border: `1px solid ${T.line}`,
                            borderRadius: T.radiusLg,
                            padding: "24px 20px 22px",
                            boxShadow: T.shadowCard,
                            overflow: "hidden",
                          }}
                        >
                          {/* Numéro d'étape en filigrane, très en arrière-plan */}
                          <span
                            aria-hidden="true"
                            className="rp-display"
                            style={{
                              position: "absolute", top: -16, right: 6,
                              fontSize: 92, fontWeight: 900, lineHeight: 1,
                              color: s.accent, opacity: 0.07, pointerEvents: "none",
                            }}
                          >
                            {s.n}
                          </span>
                          {/* Liseré d'accent en haut de carte */}
                          <span aria-hidden="true" style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${s.accent}, transparent)` }} />

                          <span
                            aria-hidden="true"
                            style={{
                              display: "flex", alignItems: "center", justifyContent: "center",
                              width: 52, height: 52, borderRadius: 14, background: s.iconBg,
                              marginBottom: 17,
                              border: `1px solid ${s.accent}33`,
                              boxShadow: `0 8px 22px ${s.accent}2e`,
                              transform: "translateZ(34px)",
                            }}
                          >
                            <Icon name={s.icon} size={24} color={s.accent} />
                          </span>
                          <h3 style={{ fontSize: 15.5, fontWeight: 800, marginBottom: 8, color: T.ink, transform: "translateZ(20px)" }}>
                            <span style={{ color: s.accent }}>{s.n}.</span> {s.title}
                          </h3>
                          <p style={{ fontSize: 13, color: T.sub, lineHeight: 1.6, transform: "translateZ(10px)" }}>{s.text}</p>
                        </div>
                      </Tilt3D>
                    </Reveal>
                  ))}
                </div>
              </div>
            </section>

            <section style={{ maxWidth: 680, margin: "0 auto", padding: "48px 18px 10px" }}>
              <h2 className="rp-display" style={{ fontSize: 22, fontWeight: 900, textAlign: "center", marginBottom: 20 }}>Questions fréquentes</h2>
              <Reveal>
                {[
                  { q: "Une « erreur de prix », c'est quoi exactement ?", a: "Un prix affiché par erreur par le marchand : virgule décalée (449 € qui devient 44,90 €), mauvaise référence, remise mal paramétrée. Ces offres durent souvent quelques heures avant correction." },
                  { q: "Suis-je sûr de recevoir le produit si je commande ?", a: "Non, et c'est important : en droit français, un vendeur peut annuler une commande en cas d'erreur manifeste sur le prix. Plus l'erreur est énorme, plus l'annulation est probable. C'est une loterie — parfois ça passe, surtout si le colis est expédié rapidement." },
                  { q: "Comment le prix de référence est-il calculé ?", a: "Notre algorithme compare chaque offre à la médiane des autres vendeurs pour le même produit, et à l'historique de prix déjà enregistré. Plus l'historique est riche, plus la référence est précise." },
                  { q: "Les offres affichées sont-elles garanties exactes ?", a: "Non. Les prix bougent en permanence et l'algorithme peut se tromper, notamment si un vendeur liste un produit différent sous un titre trompeur. Considérez chaque résultat comme une piste à vérifier immédiatement sur le site marchand." },
                  { q: "RadarPrix touche-t-il une commission sur mes achats ?", a: "Non. Les liens pointent directement vers les fiches produit trouvées lors du scan, sans tracking d'affiliation." },
                ].map((f) => (
                  <details key={f.q} className="rp-faq">
                    <summary>{f.q}</summary>
                    <p>{f.a}</p>
                  </details>
                ))}
              </Reveal>
            </section>

            <section style={{ maxWidth: 680, margin: "0 auto", padding: "24px 18px 0" }}>
              <div style={{ background: "rgba(255,197,61,0.08)", border: `1px solid ${T.yellow}`, borderRadius: 12, padding: "14px 16px", fontSize: 13, color: T.ink, lineHeight: 1.6 }}>
                <Icon name="alertTriangle" size={15} color={T.yellow} style={{ display: "inline-block", verticalAlign: "-2px", marginRight: 6 }} /><strong>Transparence :</strong> RadarPrix est un outil d'information. Les offres sont détectées automatiquement et peuvent être inexactes, expirées ou annulées par le vendeur. Vérifiez toujours l'offre et le vendeur avant d'acheter.
              </div>
            </section>

            {/* Appel à l'action final : la page se terminait sur un avertissement
                légal puis le pied de page, sans rien proposer au visiteur qui
                avait tout lu. */}
            <section style={{ position: "relative", overflow: "hidden", marginTop: 56 }}>
              <div className="rp-aurora" aria-hidden="true" style={{ opacity: 0.55 }}>
                <span style={{ top: "-50%", left: "26%", width: 520, height: 420, background: "rgba(255,106,26,.22)" }} />
                <span style={{ bottom: "-54%", right: "20%", width: 440, height: 380, background: "rgba(139,92,246,.18)", animationDelay: "-8s" }} />
              </div>
              <div style={{ position: "relative", zIndex: 1, maxWidth: 720, margin: "0 auto", padding: "62px 18px 68px", textAlign: "center" }}>
                <Reveal depth>
                  <h2 className="rp-display" style={{ fontSize: "clamp(21px, 3.4vw, 31px)", fontWeight: 900, letterSpacing: "-0.01em", lineHeight: 1.15 }}>
                    Une erreur de prix dure<br />
                    <span style={{ background: T.ember, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>quelques heures.</span>
                  </h2>
                  <p style={{ color: T.sub, fontSize: 15, lineHeight: 1.65, maxWidth: 460, margin: "16px auto 28px" }}>
                    Le temps de rafraîchir la page, c'est déjà corrigé. Crée un compte et reçois un email dès qu'une anomalie est repérée sur un produit que tu suis.
                  </p>
                  <div style={{ display: "flex", gap: 11, justifyContent: "center", flexWrap: "wrap" }}>
                    <button
                      onClick={() => (authToken ? setView("favoris") : setAuthOpen(true))}
                      className="rp-cta"
                      style={{ display: "flex", alignItems: "center", gap: 9, background: T.ember, border: "none", borderRadius: 11, padding: "14px 26px", color: "#0C0E14", fontSize: 14.5, fontWeight: 900, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}
                    >
                      <Icon name="bell" size={17} />
                      {authToken ? "Gérer mes alertes" : "Créer mon compte gratuit"}
                    </button>
                    <button
                      onClick={() => openTab("erreurs")}
                      className="rp-cta"
                      style={{ background: "none", border: `1.5px solid ${T.line}`, borderRadius: 11, padding: "14px 24px", color: T.ink, fontSize: 14.5, fontWeight: 800, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}
                    >
                      Voir les erreurs en cours
                    </button>
                  </div>
                  <p style={{ fontSize: 11.5, color: T.muted, marginTop: 18 }}>
                    Gratuit, sans carte bancaire. Ton email ne sert qu'aux alertes.
                  </p>
                </Reveal>
              </div>
            </section>
          </>
        )}

        {view === "results" && (
          <main style={{ maxWidth: 620, margin: "0 auto", padding: "22px 16px 40px" }}>
            <button onClick={goHome} style={{ background: "none", border: "none", color: T.sub, fontWeight: 700, fontSize: 13, cursor: "pointer", padding: 0, marginBottom: 12, fontFamily: "'Inter', sans-serif" }}>
              ← Accueil
            </button>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginBottom: 4 }}>
              <h2 className="rp-display" style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 20, fontWeight: 900, flex: 1, minWidth: 0, overflowWrap: "break-word" }}>
                {searchTerm ? (
                  <>
                    <Icon name="search" size={18} color={T.sub} /> {`« ${searchTerm} »`}
                  </>
                ) : tab === "erreurs" ? (
                  <>
                    <Icon name="alertCircle" size={18} color={T.red} /> Erreurs de prix
                  </>
                ) : (
                  <>
                    <Icon name="flame" size={18} color={T.emberSolid} /> Gros deals
                  </>
                )}
              </h2>
              <button
                onClick={followCurrentSearch}
                className="rp-pressable rp-cta"
                style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0, background: "none", border: `1.5px solid ${T.emberSolid}`, borderRadius: 8, padding: "7px 12px", color: T.ink, fontSize: 12, fontWeight: 800, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}
              >
                <Icon name="star" size={13} /> Suivre
              </button>
            </div>

            {/* Recherche pleine largeur, mobile uniquement : remplace le champ
                de la barre du haut, masqué sous 640px (il s'y écrasait). */}
            <div className="rp-mobile-search" style={{ display: "none", marginBottom: 14 }}>
              <SearchBar onSearch={(t) => searchProduct(t)} placeholder="Rechercher un produit…" />
            </div>
            {followMsg && <p className="toast-in" style={{ fontSize: 12, color: T.green, marginBottom: 6 }}>{followMsg}</p>}
            {lastScan && !loading && (
              <p style={{ fontSize: 12, color: T.sub, marginBottom: 14 }}>
                {searchTerm
                  ? `Scan de ${lastScan} · ${visible.length}/${items ? items.length : 0} offre(s) affichée(s)`
                  : `${totalDeals} deal(s) au total dans cette catégorie · ${visible.length}/${items ? items.length : 0} chargée(s) et affichée(s)`}
              </p>
            )}

            {!searchTerm && (
              <div style={{ display: "flex", gap: 8, marginBottom: 12, marginTop: 8 }}>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  aria-label="Catégorie de produits"
                  style={{ flex: 1, padding: "12px", borderRadius: 10, border: `1.5px solid ${T.line}`, background: T.surface2, color: T.ink, fontSize: 14, fontWeight: 700, fontFamily: "'Inter', system-ui, sans-serif" }}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>{c.label}</option>
                  ))}
                </select>
                <button
                  onClick={() => openTab(tab)}
                  disabled={loading}
                  style={{ padding: "0 18px", borderRadius: 10, border: "none", background: loading ? T.surface2 : T.ember, color: loading ? T.sub : "#0C0E14", fontWeight: 900, fontSize: 13, cursor: loading ? "default" : "pointer", fontFamily: "'Inter', sans-serif" }}
                >
                  Relancer
                </button>
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <FilterChip active={verdictFilter === "all"} onClick={() => setVerdictFilter("all")}>Tout</FilterChip>
                <FilterChip active={verdictFilter === "erreur"} onClick={() => setVerdictFilter("erreur")}><Icon name="alertCircle" size={13} /> Erreurs</FilterChip>
                <FilterChip active={verdictFilter === "deal"} onClick={() => setVerdictFilter("deal")}><Icon name="flame" size={13} /> Deals</FilterChip>
              </div>
              <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                <span style={{ fontSize: 12, color: T.sub, fontWeight: 700 }}>Trier :</span>
                <FilterChip active={sortBy === "score"} onClick={() => setSortBy("score")}><Icon name="gem" size={13} /> Meilleur score</FilterChip>
                <FilterChip active={sortBy === "prix"} onClick={() => setSortBy("prix")}>Prix croissant</FilterChip>
              </div>

              {/* Tranche de prix et marchand : les deux premiers réflexes de
                  quelqu'un qui cherche une affaire. Seul le prix maximum
                  existait jusqu'ici. */}
              <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                <span style={{ fontSize: 12, color: T.sub, fontWeight: 700 }}>Prix :</span>
                <input
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value.replace(/[^0-9]/g, ""))}
                  placeholder="min €"
                  inputMode="numeric"
                  aria-label="Prix minimum en euros"
                  style={{ width: 78, padding: "8px 10px", borderRadius: 20, border: `1.5px solid ${T.line}`, fontSize: 12, background: T.surface2, color: T.ink, fontFamily: "'Inter', sans-serif" }}
                />
                <span style={{ color: T.muted, fontSize: 12 }}>–</span>
                <input
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value.replace(/[^0-9]/g, ""))}
                  placeholder="max €"
                  inputMode="numeric"
                  aria-label="Prix maximum en euros"
                  style={{ width: 78, padding: "8px 10px", borderRadius: 20, border: `1.5px solid ${T.line}`, fontSize: 12, background: T.surface2, color: T.ink, fontFamily: "'Inter', sans-serif" }}
                />

                {sellersDisponibles.length > 1 && (
                  <select
                    value={sellerFilter}
                    onChange={(e) => setSellerFilter(e.target.value)}
                    aria-label="Filtrer par marchand"
                    style={{ padding: "8px 10px", borderRadius: 20, border: `1.5px solid ${T.line}`, fontSize: 12, background: T.surface2, color: T.ink, fontFamily: "'Inter', sans-serif", fontWeight: 700, maxWidth: 160 }}
                  >
                    <option value="tous">Tous les marchands</option>
                    {sellersDisponibles.map((v) => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </select>
                )}

                {filtresActifs > 0 && (
                  <button
                    onClick={reinitialiserFiltres}
                    style={{ background: "none", border: "none", color: T.emberSolid, fontSize: 12, fontWeight: 800, cursor: "pointer", fontFamily: "'Inter', sans-serif", padding: "8px 4px" }}
                  >
                    Réinitialiser ({filtresActifs})
                  </button>
                )}
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {loading && (
                <>
                  <div style={{ textAlign: "center", color: T.sub, fontSize: 13, marginBottom: 4 }}>
                    Interrogation des marchands en cours…
                  </div>
                  {[0, 1, 2, 3].map((i) => (
                    <SkeletonCard key={`skeleton-${i}`} />
                  ))}
                </>
              )}
              {error && (
                <div style={{ background: "rgba(255,59,48,0.12)", border: `1.5px solid ${T.red}`, borderRadius: 10, padding: 12, fontSize: 14, color: T.ink }}>
                  {error}
                </div>
              )}
              {items && visible.length === 0 && !loading && (
                <div style={{ textAlign: "center", color: T.sub, fontSize: 14, padding: 26 }}>
                  {items.length > 0
                    ? `${items.length} offre(s) trouvée(s) mais masquée(s) par vos filtres — élargissez-les.`
                    : "Aucune anomalie de prix détectée à l'instant pour cette recherche. Essayez une autre catégorie ou revenez plus tard."}
                </div>
              )}
              {visible.map((it, i) => (
                <DealCard key={i} item={it} index={i} authToken={authToken} onNeedAuth={() => setAuthOpen(true)} onOpenDetail={openDealDetail} />
              ))}
              {items && items.length > 0 && !loading && !searchTerm && hasMore && (
                <button
                  onClick={loadMoreDeals}
                  disabled={loadingMore}
                  style={{ padding: "13px", borderRadius: 10, border: `1.5px solid ${T.emberSolid}`, background: "transparent", color: loadingMore ? T.sub : T.ink, fontWeight: 800, fontSize: 13.5, cursor: loadingMore ? "default" : "pointer", fontFamily: "'Inter', sans-serif" }}
                >
                  {loadingMore ? "Chargement…" : `Voir plus (${totalDeals - visible.length} restant(s))`}
                </button>
              )}
              {items && items.length > 0 && !loading && searchTerm && (
                <button
                  onClick={() => searchProduct(searchTerm)}
                  style={{ padding: "13px", borderRadius: 10, border: `1.5px solid ${T.emberSolid}`, background: "transparent", color: T.ink, fontWeight: 800, fontSize: 13.5, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}
                >
                  <Icon name="refresh" size={15} /> Relancer ce scan (nouveaux prix)
                </button>
              )}
              {items && !loading && (
                <div style={{ textAlign: "center", color: T.sub, fontSize: 12 }}>
                  Vérifiez toujours l'offre et le vendeur avant d'acheter
                </div>
              )}
            </div>
          </main>
        )}

        {view === "admin" && authRole === "admin" && (
          <AdminDashboard token={authToken} onBack={goHome} />
        )}

        {view === "marchand" && marchandActif && (
          <Suspense fallback={<ViewLoader />}>
            <MerchantView
              name={marchandActif}
              authToken={authToken}
              onNeedAuth={() => setAuthOpen(true)}
              onBack={goHome}
              onOpenDetail={openDealDetail}
            />
          </Suspense>
        )}

        {view === "membre" && membreActif && (
          <Suspense fallback={<ViewLoader />}>
            <ProfileView
              handle={membreActif}
              authToken={authToken}
              currentUser={authUser}
              onBack={goHome}
              onNeedAuth={() => setAuthOpen(true)}
              onOpenThread={(id) => { setActiveThreadId(id); setView("communaute-forum-thread"); window.scrollTo(0, 0); }}
              onMessage={(id) => { setChatCible(id); goToCommunity("communaute-chat"); }}
            />
          </Suspense>
        )}

        {view === "dealDetail" && dealDetailItem && (
          <Suspense fallback={<ViewLoader />}>
            <ProductDetailView
              item={dealDetailItem}
              authToken={authToken}
              onNeedAuth={() => setAuthOpen(true)}
              onBack={goHome}
              onOpenDetail={openDealDetail}
              onOpenMerchant={openMerchant}
            />
          </Suspense>
        )}

        {view === "favoris" && authToken && (
          <FavorisView
            token={authToken}
            onBack={goHome}
            onOpenSearch={(q) => searchProduct(q)}
            onOpenDetail={openDealDetail}
            onNeedAuth={() => setAuthOpen(true)}
          />
        )}

        {view === "communaute-chat" && authToken && (
          <Suspense fallback={<ViewLoader />}>
            <ChatView
              token={authToken}
              currentUserId={authUser?.id}
              onBack={goHome}
              correspondant={chatCible}
              subnav={<CommunityTabs courante="communaute-chat" onNavigate={goToCommunity} />}
            />
          </Suspense>
        )}

        {view === "communaute-picks" && authToken && (
          <CommunityPicksView token={authToken} onBack={goHome} onNeedAuth={() => setAuthOpen(true)} onGoTo={goToCommunity} />
        )}

        {view === "communaute-forum" && authToken && (
          <ForumView
            token={authToken}
            onBack={goHome}
            onGoTo={goToCommunity}
            onOpenThread={(id) => {
              setActiveThreadId(id);
              setView("communaute-forum-thread");
              window.scrollTo(0, 0);
            }}
          />
        )}

        {view === "communaute-forum-thread" && authToken && activeThreadId && (
          <ThreadDetailView
            threadId={activeThreadId}
            token={authToken}
            currentUserId={authUser?.id}
            onBack={() => setView("communaute-forum")}
          />
        )}
      </div>

      <MobileNav active={mobileNavActive} onNavigate={handleMobileNav} />
      <Footer
        setLegalPage={setLegalPage}
        goHome={goHome}
        openTab={openTab}
        goToCommunity={goToCommunity}
        authToken={authToken}
        onNeedAuth={() => setAuthOpen(true)}
        onOpenFavoris={() => { setView("favoris"); window.scrollTo(0, 0); }}
      />
      <LegalModal page={legalPage} onClose={() => setLegalPage(null)} />
      {authOpen && (
        <AuthModal
          onClose={() => setAuthOpen(false)}
          onSuccess={(token, user, estUneInscription) => {
            setAuthToken(token);
            localStorage.setItem("radarprix_token", token);
            persistUser(user);
            setAuthOpen(false);
            // Un compte tout neuf n'a pas de pseudo : il s'afficherait
            // "Membre #7" partout, y compris comme adresse de son profil.
            if (estUneInscription && !user.pseudo) setOnboarding(true);
          }}
        />
      )}
      {onboarding && authUser && authToken && (
        <OnboardingModal
          user={authUser}
          token={authToken}
          onUpdated={(u) => persistUser(u)}
          onDone={() => setOnboarding(false)}
        />
      )}
      {settingsOpen && authUser && (
        <SettingsModal
          user={authUser}
          token={authToken}
          onClose={() => setSettingsOpen(false)}
          onUpdated={(u) => persistUser(u)}
          onAccountDeleted={() => {
            setSettingsOpen(false);
            logout();
            goHome();
          }}
        />
      )}
    </div>
  );
}
