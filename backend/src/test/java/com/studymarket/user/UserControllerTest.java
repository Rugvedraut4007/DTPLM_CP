package com.studymarket.user;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.math.BigDecimal;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

class UserControllerTest {

	private MockMvc mockMvc;
	private UserService userService;

	@BeforeEach
	void setUp() {
		userService = mock(UserService.class);
		mockMvc = MockMvcBuilders.standaloneSetup(new UserController(userService)).build();
	}

	@Test
	void postCreatesUserWithDefaultBalance() throws Exception {
		User user = new User("alice", "alice@example.com");
		user.initializeUser();
		when(userService.createUser("alice", "alice@example.com")).thenReturn(user);

		mockMvc.perform(post("/api/users")
					.contentType(MediaType.APPLICATION_JSON)
					.content("{\"username\":\"alice\",\"email\":\"alice@example.com\"}"))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.simulatedBtcBalance").value(1.0));
	}

	@Test
	void getReturnsUser() throws Exception {
		User user = new User("alice", "alice@example.com");
		user.initializeUser();
		when(userService.getUserById(7L)).thenReturn(Optional.of(user));

		mockMvc.perform(get("/api/users/7"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.username").value("alice"))
				.andExpect(jsonPath("$.simulatedBtcBalance").value(1.0));
	}
}