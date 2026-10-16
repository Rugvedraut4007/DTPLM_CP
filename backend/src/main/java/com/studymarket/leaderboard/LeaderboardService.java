package com.studymarket.leaderboard;

import com.studymarket.user.User;
import com.studymarket.user.UserRepository;
import java.util.Comparator;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class LeaderboardService {
	private final UserRepository userRepository;

	public LeaderboardService(UserRepository userRepository) { this.userRepository = userRepository; }

	@Transactional(readOnly = true)
	public List<LeaderboardEntry> getLeaderboard(Integer requestedLimit) {
		int limit = requestedLimit == null ? 20 : requestedLimit;
		if (limit <= 0) throw new IllegalArgumentException("Limit must be greater than zero");
		limit = Math.min(limit, 100);
		return userRepository.findAll().stream()
				.sorted(Comparator.comparingLong(User::getXp).reversed()
						.thenComparing(Comparator.comparingInt(User::getCurrentStreak).reversed())
						.thenComparing(User::getId))
				.limit(limit)
				.map(user -> new LeaderboardEntry(0, user.getId(), user.getUsername(), user.getXp(), user.getCurrentStreak()))
				.collect(java.util.stream.Collectors.collectingAndThen(java.util.stream.Collectors.toList(), entries -> {
					java.util.List<LeaderboardEntry> ranked = new java.util.ArrayList<>();
					for (int i = 0; i < entries.size(); i++) ranked.add(entries.get(i).withRank(i + 1));
					return ranked;
				}));
	}

	public record LeaderboardEntry(int rank, Long userId, String username, long xp, int currentStreak) {
		LeaderboardEntry withRank(int value) { return new LeaderboardEntry(value, userId, username, xp, currentStreak); }
	}
}