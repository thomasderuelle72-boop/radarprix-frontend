// ChatView.jsx — Le salon général.
//
// Cette vue portait deux choses en même temps : le salon public et les
// messages privés, séparés par un sélecteur d'onglets. Ils n'ont pourtant ni
// le même public, ni le même usage — on entre dans un salon pour lire ce qui
// s'y dit, on ouvre une messagerie parce que quelqu'un attend une réponse.
//
// Les messages privés ont désormais leur page (MessagerieView), accessible
// depuis l'enveloppe de l'en-tête. Il ne reste ici que le salon, qui garde sa
// place dans la communauté, à côté du forum et des deals des membres.
import { useState, useEffect, useRef } from "react";
import { T } from "../theme.js";
import { apiGetPublicChat, apiPostPublicChat } from "../api.js";
import PageShell from "./PageShell.jsx";
import Icon from "./Icon.jsx";
import MessageList from "./MessageList.jsx";
import MessageComposer from "./MessageComposer.jsx";

const SONDAGE_SALON = 4000;

export default function ChatView({ token, currentUserId, onBack, subnav }) {
  const [salon, setSalon] = useState([]);
  const [erreur, setErreur] = useState(null);
  const dernierId = useRef(0);

  useEffect(() => {
    let arrete = false;
    const sonder = async () => {
      try {
        const arrivees = await apiGetPublicChat(dernierId.current);
        if (arrete || arrivees.length === 0) return;
        dernierId.current = arrivees[arrivees.length - 1].id;
        setSalon((p) => [...p, ...arrivees]);
      } catch { /* le réseau peut hoqueter : le sondage suivant rattrapera */ }
    };
    sonder();
    const t = setInterval(sonder, SONDAGE_SALON);
    return () => { arrete = true; clearInterval(t); };
  }, []);

  const envoyer = async (texte) => {
    setErreur(null);
    try {
      await apiPostPublicChat(token, texte);
      // On ne rajoute pas le message à la main : le sondage le rapportera
      // avec son identifiant et sa date réels, ce qui évite un doublon
      // fugace puis un remplacement à l'écran.
    } catch (e) {
      setErreur(e.message);
    }
  };

  return (
    <PageShell
      icon="message"
      iconColor={T.cyan}
      title="Salon général"
      subtitle="Ouvert à tous les membres : une question sur un deal, un retour sur une commande, un doute sur un prix."
      onBack={onBack}
      width={860}
      subnav={subnav}
    >
      {erreur && <p style={{ color: T.red, fontSize: 12.5, marginBottom: 12 }}>{erreur}</p>}

      <MessageList
        messages={salon}
        currentUserId={currentUserId}
        hauteur={460}
        vide={
          <>
            <span
              aria-hidden="true"
              style={{
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                width: 52, height: 52, borderRadius: "50%", marginBottom: 12,
                background: `${T.cyan}14`, border: `1px solid ${T.cyan}3a`,
              }}
            >
              <Icon name="message" size={24} color={T.cyan} />
            </span>
            <h4 className="rp-display" style={{ fontSize: 15, fontWeight: 900, color: T.ink, marginBottom: 6 }}>
              Le salon est calme
            </h4>
            <p style={{ fontSize: 12.5, color: T.sub, lineHeight: 1.6 }}>
              Personne n'a encore écrit. Une question sur un deal, un retour sur une commande :
              lance la discussion.
            </p>
          </>
        }
      />
      <MessageComposer onSend={envoyer} placeholder="Écris au salon général…" />

      <p style={{ fontSize: 11.5, color: T.muted, marginTop: 12, lineHeight: 1.6 }}>
        Ce salon est public : tout membre connecté lit ce qui s'y écrit. Pour un échange à deux,
        passe par les messages privés — l'enveloppe en haut de l'écran.
      </p>
    </PageShell>
  );
}
