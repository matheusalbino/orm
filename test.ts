import debug from "debug";
import "reflect-metadata";
import { Column, Entity, EntityRepository } from "./lib/decorators";
import { Repository } from "./lib/repository";

const logger = debug("equal:demo");

class Profile {
  @Column()
  photo!: string;
}

@Entity()
class Post {
  @Column({ type: "uuid", primary: true })
  id!: string;

  @Column()
  title!: string;

  @Column({ type: "uuid" })
  userId!: string;
}

@Entity()
class User {
  @Column({ type: "uuid", primary: true })
  id!: string;

  @Column()
  name!: string;

  // @Column()
  // profile!: Profile;

  @Column({ entity: Post })
  posts!: Post[];
}

@EntityRepository(User)
class UserRepository extends Repository<User> {}

@EntityRepository(Post)
class PostRepository extends Repository<Post> {}

async function bootstrap() {
  const userRepo = new UserRepository();
  const postRepo = new PostRepository();

  await postRepo.createTable(true);
  await userRepo.createTable(true);

  const user = new User();
  user.name = "equal";

  await userRepo.save(user);

  await postRepo.save({
    title: "Teste 1",
    userId: user.id,
  });

  await postRepo.save({
    title: "Teste 2",
    userId: user.id,
  });

  await userRepo.find({
    relations: ["posts"],
  });
}

bootstrap().catch((err) => {
  logger("%s", err.stack);
});
