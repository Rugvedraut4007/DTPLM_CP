package com.studymarket.challenge;

import com.studymarket.study.StudySession;
import com.studymarket.study.StudySessionRepository;
import com.studymarket.user.User;
import com.studymarket.user.UserRepository;
import java.time.*;
import java.util.*;
import org.springframework.stereotype.Service;

@Service
public class ChallengeService {
	private final ChallengeRepository challenges; private final UserChallengeRepository userChallenges; private final StudySessionRepository sessions; private final UserRepository users; private final Clock clock;
	public ChallengeService(ChallengeRepository c,UserChallengeRepository uc,StudySessionRepository s,UserRepository u,Clock clock){challenges=c;userChallenges=uc;sessions=s;users=u;this.clock=clock;}
	public void evaluate(User user, StudySession completed){
		List<StudySession> all=sessions.findAllByUserAndStatus(user,"COMPLETED"); if(!all.contains(completed))all=new ArrayList<>(all); if(!all.contains(completed))all.add(completed);
		long minutes=all.stream().mapToLong(s->s.getDurationSeconds()==null?0:s.getDurationSeconds()/60).sum();
		Set<LocalDate> goalDays=new HashSet<>(); Map<LocalDate,Long> days=new HashMap<>(); for(StudySession s:all)if(s.getEndedAt()!=null)days.merge(s.getEndedAt().atZone(clock.getZone()).toLocalDate(),s.getDurationSeconds()/60,Long::sum); days.forEach((d,m)->{if(m>=user.getDailyGoalMinutes())goalDays.add(d);});
		update(user,"STUDY_60_MIN",minutes); update(user,"STUDY_3_SESSIONS",all.size()); update(user,"GOAL_3_DAYS",goalDays.size());
	}
	private void update(User u,String code,long value){challenges.findAllByActiveTrueOrderByIdAsc().stream().filter(c->c.getCode().equals(code)).findFirst().ifPresent(c->{UserChallenge uc=userChallenges.findByUserAndChallenge(u,c).orElseGet(()->new UserChallenge(u,c));uc.update((int)value,Instant.now(clock));userChallenges.save(uc);});}
	public List<Challenge> available(){return challenges.findAllByActiveTrueOrderByIdAsc();}
	public List<UserChallenge> userChallenges(Long id){User u=users.findById(id).orElseThrow(()->new IllegalArgumentException("User not found: "+id));return userChallenges.findAllByUserOrderByCreatedAtAsc(u);}
	public UserChallenge claim(Long userId,Long challengeId){User u=users.findById(userId).orElseThrow(()->new IllegalArgumentException("User not found: "+userId));Challenge c=challenges.findById(challengeId).orElseThrow(()->new IllegalArgumentException("Challenge not found: "+challengeId));UserChallenge uc=userChallenges.findByUserAndChallenge(u,c).orElseThrow(()->new IllegalStateException("Challenge is not completed"));if(!uc.isCompleted())throw new IllegalStateException("Challenge is not completed");return uc;}
}