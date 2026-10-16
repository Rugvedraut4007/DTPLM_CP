package com.studymarket.user;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.util.Optional;
import org.junit.jupiter.api.Test;

class UserServiceTest {

	private final UserRepository userRepository = mock(UserRepository.class);
	private final UserService userService = new UserService(userRepository);

	@Test
	void createUserStartsWithOneSimulatedBtc() {
		User user = new User("alice", "alice@example.com");
		when(userRepository.save(any(User.class))).thenAnswer(invocation -> {
			User savedUser = invocation.getArgument(0);
			savedUser.initializeUser();
			return savedUser;
		});

		User createdUser = userService.createUser("alice", "alice@example.com");

		assertThat(createdUser.getSimulatedBtcBalance()).isEqualByComparingTo(new BigDecimal("1.0000"));
		assertThat(createdUser.getXp()).isZero();
		assertThat(createdUser.getCreatedAt()).isNotNull();
	}

	@Test
	void getUserByIdReturnsUserFromRepository() {
		User user = new User("alice", "alice@example.com");
		when(userRepository.findById(7L)).thenReturn(Optional.of(user));

		assertThat(userService.getUserById(7L)).containsSame(user);
		verify(userRepository).findById(7L);
	}
}