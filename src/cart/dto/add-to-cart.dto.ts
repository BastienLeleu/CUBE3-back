import { IsNotEmpty, IsInt, IsString, Min, IsUUID } from 'class-validator';

export class AddToCartDto {
  @IsUUID()
  @IsString()
  @IsNotEmpty()
  product_id: string;

  @IsInt()
  @Min(1)
  quantity: number;
}
