package com.studymarket.leaderboard;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.studymarket.user.User;
import com.studymarket.user.UserRepository;
import java.util.List;
import java.lang.reflect.Field;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class LeaderboardServiceTest {
	private UserRepository userRepository;
	private LeaderboardService service;

	@BeforeEach
	void setUp() {
		userRepository = mock(UserRepository.class);
		service = new LeaderboardService(userRepository);
	}

	@Test
	void sortsByXpThenStreakThenUserIdAndIncludesZeroXp() {
		User first = user(1L, "Alice", 100, 2);
		User second = user(2L, "Bob", 100, 3);
		User third = user(3L, "Cara", 0, 0);
		when(userRepository.findAll()).thenReturn(List.of(third, first, second));

		List<LeaderboardService.LeaderboardEntry> entries = service.getLeaderboard(null);

		assertThat(entries).extracting(LeaderboardService.LeaderboardEntry::userId).containsExactly(2L, 1L, 3L);
		assertThat(entries).extracting(LeaderboardService.LeaderboardEntry::rank).containsExactly(1, 2, 3);
		assertThat(entries.getFirst().username()).isEqualTo("Bob");
	}

	@Test
	void limitAndInvalidLimitWork() {
		when(userRepository.findAll()).thenReturn(List.of(user(1L, "A", 1, 0), user(2L, "B", 0, 0)));
		assertThat(service.getLeaderboard(1)).hasSize(1);
		assertThatThrownBy(() -> service.getLeaderboard(0)).isInstanceOf(IllegalArgumentException.class);
	}

	@Test
	void entriesExposeNoPrivateFields() {
		when(userRepository.findAll()).thenReturn(List.of(user(1L, "A", 10, 1)));
		Object entry = service.getLeaderboard(20).getFirst();
		assertThat(entry).isInstanceOf(LeaderboardService.LeaderboardEntry.class);
		assertThat(entry.toString()).doesNotContain("email", "balance");
	}

	private User user(Long id, String name, long xp, int streak) {
		User user = new User(name, name.toLowerCase() + "@example.com");
		try {
			Field idField = User.class.getDeclaredField("id");
			idField.setAccessible(true);
			idField.set(user, id);
		} catch (ReflectiveOperationException exception) {
			throw new IllegalStateException(exception);
		}
		for (long index = 0; index < xp; index++) user.addXp(1);
		for (int index = 0; index < streak; index++) user.recordGoalCompletion(java.time.LocalDate.of(2026, 1, index + 1));
		return user;
	}
}