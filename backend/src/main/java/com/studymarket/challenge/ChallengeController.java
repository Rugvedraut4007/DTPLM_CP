package com.studymarket.challenge;
import java.util.List;
import org.springframework.web.bind.annotation.*;
@RestController public class ChallengeController{
	private final ChallengeService service; public ChallengeController(ChallengeService s){service=s;}
	@GetMapping("/api/challenges") public List<Challenge> all(){return service.available();}
	@GetMapping("/api/users/{userId}/challenges") public List<UserChallenge> user(@PathVariable Long userId){return service.userChallenges(userId);}
	@PostMapping("/api/users/{userId}/challenges/{challengeId}/claim") public UserChallenge claim(@PathVariable Long userId,@PathVariable Long challengeId){return service.claim(userId,challengeId);}
}