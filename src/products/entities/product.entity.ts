import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Check,
} from 'typeorm';
import { Min } from 'class-validator';
import { User } from '../../users/entities/user.entity';
import { DecimalTransformer } from '../../utils/decimal.transformer';

export enum ProductCondition {
  NEW = 'NEW',
  VERY_GOOD = 'VERY_GOOD',
  GOOD = 'GOOD',
  USED = 'USED',
}

@Entity('products')
@Check('CHK_product_price_positive', '"price" > 0')
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    transformer: new DecimalTransformer(),
  })
  @Min(0.01)
  price: number;

  @Column({
    type: 'simple-enum',
    enum: ProductCondition,
    default: ProductCondition.GOOD,
  })
  condition: ProductCondition;

  @Column({ type: 'varchar', length: 100, nullable: true })
  category: string;

  @Column({ type: 'varchar', length: 512, nullable: true })
  image_url: string;

  @ManyToOne(() => User, (user) => user.products, { nullable: false })
  @JoinColumn({ name: 'seller_id' })
  seller: User;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;
}
