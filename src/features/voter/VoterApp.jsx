// src/features/voter/VoterApp.jsx
import { useState } from "react";
import { Icon } from "../../components/common";
import VoterDashboard   from "./VoterDashboard";
import CandidatesScreen from "./CandidatesScreen";
import SurveyScreen     from "./SurveyScreen";
import VotePage         from "./VotePage";
import ResultsScreen    from "./ResultsScreen";
import ProfileScreen    from "./ProfileScreen";

const VOTER_NAV = [
  { id:"home",       label:"Home",       icon:"home"      },
  { id:"candidates", label:"Candidates", icon:"candidate" },
  { id:"vote",       label:"Vote",       icon:"vote"      },
  { id:"survey",     label:"Survey",     icon:"survey"    },
  { id:"results",    label:"Results",    icon:"trophy"    },
  { id:"profile",    label:"Profile",    icon:"person"    },
];

const VoterApp = ({ user, onLogout }) => {
  const [tab, setTab]         = useState("home");
  const [voted, setVoted]     = useState(false);
  const [surveyDone, setSurveyDone] = useState(false);

  const renderTab = () => {
    switch (tab) {
      case "home":       return <VoterDashboard user={user} voted={voted} onGoVote={() => setTab("vote")} onGoSurvey={() => setTab("survey")} />;
      case "candidates": return <CandidatesScreen />;
      case "vote":       return <VotePage user={user} onVoted={() => setVoted(true)} />;
      case "survey":     return <SurveyScreen user={user} onComplete={() => setSurveyDone(true)} surveyDone={surveyDone} />;
      case "results":    return <ResultsScreen />;
      case "profile":    return <ProfileScreen user={user} voted={voted} onLogout={onLogout} />;
      default:           return null;
    }
  };

  return (
    <div style={{ height:"100vh", display:"flex", flexDirection:"column", background:"var(--gray-50)" }}>
      <div style={{ background:"white", padding:"12px 16px", display:"flex", alignItems:"center", justifyContent:"space-between", borderBottom:"1px solid var(--gray-100)", flexShrink:0, height:56 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <div style={{ width:28, height:28, borderRadius:8, background:"var(--teal)", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <Icon name="vote" size={16} color="white" />
          </div>
          <span style={{ fontFamily:"var(--font-display)", fontSize:18, color:"var(--navy)" }}>PickPal</span>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <button style={{ background:"none", border:"none", cursor:"pointer", color:"var(--gray-500)" }}><Icon name="bell" size={20} /></button>
          {voted && <span className="badge badge-green" style={{ fontSize:11 }}>Voted</span>}
        </div>
      </div>

      <div style={{ flex:1, overflow:"hidden" }}>{renderTab()}</div>

      <div className="bottom-nav">
        {VOTER_NAV.map(item => (
          <button key={item.id} className={`bottom-nav-item ${tab===item.id?"active":""}`} onClick={() => setTab(item.id)}>
            <span className="tab-icon"><Icon name={item.icon} size={22} /></span>
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
};
export default VoterApp;
